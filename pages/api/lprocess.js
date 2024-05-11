import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';
import { OpenAI } from "openai";
const openai = new OpenAI();
const lastRequestTimeByIP = {};
export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  const currentTime = Date.now();
  const lastRequestTime = lastRequestTimeByIP[ip];

  // Check if the current request is within 60 seconds of the last request
  if (lastRequestTime && currentTime - lastRequestTime < 60000) {
    return res.status(429).json({ error: "Please wait a minute before making another request." });
  }
  

  if (req.method === 'POST') {
    let data = req.body.resume;
    let jobDesc = req.body.jobDescription;

    // Load the DOCX file as a binary
    const templatePath = path.resolve(process.cwd(), 'public', 'resume_template.docx');
    const content = fs.readFileSync(templatePath, 'binary');

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: (part) => {
            if (!part.module) {
                return "";
            }
            if (part.module === "rawxml") {
                return "";
            }
            return "";
        },
    });

    // Set the templateVariables
    lastRequestTimeByIP[ip] = currentTime;
    data = await preprocess(data, jobDesc);
    console.log(`GENERATED RESUME: ${JSON.stringify(data, null, 2)}`);
    let hasProjects = data.projects && data.projects.length > 0 ? true : false;
    let hasLeadership = data.leadership && data.leadership.length > 0 ? true : false;
    let hasSkills = data.skills && data.skills.length > 0 ? true : false;
    let hasExperience = data.experiences && data.experiences.length > 0 ? true : false;
    let hasExtra = data.extracurriculars && data.extracurriculars.length > 0 ? true : false;
    let hasVolunteer = data.volunteering && data.volunteering.length > 0 ? true : false;
    let hasCerts = data.certificates && data.certificates.length > 0 ? true : false;
    let hasInterests = data.interests && data.interests.length > 0? true : false;
    console.log(`skills: ${JSON.stringify(data.skills)}`);
    doc.setData({
      profile: data.profile,
      college: data.college,
      experiences: data.experiences,
      skills: data.skills,
      projects: data.projects,
      leadership: data.leadership,
      extracurriculars: data.extracurriculars,
      volunteering: data.volunteering,
      certificates: data.certificates,
      interests: data.interests,
      hasProjects: hasProjects,
      hasLeadership: hasLeadership,
      hasSkills: hasSkills,
      hasExperience: hasExperience,
      hasExtra: hasExtra,
      hasVolunteer: hasVolunteer,
      hasCerts: hasCerts,
      hasInterests: hasInterests
    });

    try {
      // Render the document (replace all occurrences of placeholders by their values)
      doc.render();

      const buf = doc.getZip().generate({type: 'nodebuffer'});

      // MIME type for docx files
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="output.docx"');
      res.send(buf);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error processing document');
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
}

async function preprocess(data, jobDesc) {
  //Preprocess job description (possibly with gpt3) to cut down on GPT4 tokens:
  /*
  if (WordCount(jobDesc) > 200) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        response_format: { "type": "text" },
        messages: [
            {"role":"system", "content": `Shorten this job description for brevity and clarity. make sure key words stay the same, but boil it down to job name, qualifications expected, relevant experiences, etc.`},
            {"role": "user", "content": `${jobDesc}`}
        ],  
        temperature: 0.5,
        max_tokens: 2048,
      });
      jobDesc = response.choices[0].message.content;
      console.log(`Changed jobDesc: ${jobDesc}`);
    } catch (err) {
      console.log(err);
      return { message: `ERROR: ${err}`};
    }
  }
  */
  try {
    let prompt = "";
    const System = ` <|begin_of_text|><|start_header_id|>system<|end_header_id|>\n
    Revise a JSON portfolio for a specific job. Include:
    1. Emphasize relevant things using job description keywords.
    2. Reorder for relevance; focus on top matching skills/experiences.
    3. Rewrite descriptions professionally and concisely.
    4. The JSON Schema should be structured exactly how you recieved it, only reorganized.
    5. Return object containing all revised items, sorted with most relevant items to least relevant 
    6. Do not leave out anything that was in the original JSON

    Job Description: ${jobDesc}<|eot_id|>`;
    const User = `<|start_header_id|>user<|end_header_id|>\n${JSON.stringify(data, null, 2)}<|eot_id|>`;
    const Assistant = `<|start_header_id|>assistant<|end_header_id|>\n`
    prompt = System + User + Assistant;
    let response = await fetch(process.env.LOCAL_LLM, {
        method: 'POST',
        body: JSON.stringify({
            prompt,
            temperature: 0.5
        })
    });

    const rdata = await response.json();
    let jsonData = undefined;
    console.log(rdata.content);
    try {
      jsonData = JSON.parse(rdata.content);
  } catch (error) {
      //AI didnt strictly grab json, get all contents between the ```json ```
      //const matches = Array.from(rdata.content.matchAll(/```([a-zA-Z0-9_]+)\n([\s\S]*?)```/g));
      //const json = matches.map(match => match[2]);
      const start = rdata.content.indexOf('{');
      const end = rdata.content.lastIndexOf('}');

      const extractedContent = rdata.content.slice(start, end + 1);


      
      jsonData = JSON.parse(extractedContent);
  }

    //Iteratively count all words returned as content. Target 400 words max
    let wc = CountPortfolio(jsonData);
    while(wc > 370) {
      jsonData = CutPortfolio(jsonData);
      wc = CountPortfolio(jsonData);
    }
    

    return jsonData;
  } catch (err) {
    console.log(err);
    return { message: `ERROR: ${err}`};
  }
}
function CutPortfolio(portfolio) {
  let keys = Object.keys(portfolio);
  //Get longest array
  let maxSize = 0;
  let longestKey = undefined;
  for(let i = 0; i < keys.length; i++) {
    let key = keys[i];
    if(Array.isArray(portfolio[key])) {
      let arr = portfolio[key];
      if(arr.length > maxSize) {
        maxSize = arr.length;
        longestKey = key;
      }
    }
  }

  if(longestKey) {
    portfolio[longestKey].pop();
  }
  return portfolio;
}

function CountPortfolio(portfolio) {
  let keys = Object.keys(portfolio);

  let wordCount = 0;
  for(let i = 0; i < keys.length; i++) {
    let key = keys[i];
    if(Array.isArray(portfolio[key])) {
      let arr = portfolio[key];
      for(let j = 0; j < arr.length; j++) {
        let obj = arr[j];
        if(typeof (obj) === 'object') {
          let arrKeys = Object.keys(obj);
          for(let k = 0; k < arrKeys.length; k++) {
            wordCount += WordCount(obj[arrKeys[k]]);
          }
        } else {
          wordCount += WordCount(obj);
        }
      }
    }
  }
  return wordCount;
}

function WordCount(input) {
  let str;
  
  // Check if input is an instance of an object or a string object
  if (typeof input === 'object' && input !== null) {
    // Attempt to convert object to string if it has toString method
    if (input.toString && typeof input.toString === 'function') {
      str = input.toString();
    } else {
      // Fallback or handle the case where conversion isn't straightforward
      console.error('WordCount received an object that cannot be converted to a string:', input);
      return 0;
    }
  } else if (typeof input === 'string') {
    // Handle normal string inputs
    str = input;
  } else {
    // Log and handle unexpected types
    console.error('WordCount received an unexpected type:', typeof input);
    return 0;
  }
  
  return str.split(' ')
            .filter(function(n) { return n != '' })
            .length;
}
