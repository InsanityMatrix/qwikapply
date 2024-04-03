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
  //TODO VALIDATE ALL DATA
  //if (data.skills) {
  //  data.skills = validate("name", "content");
  //}
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { "type": "json_object" },
      messages: [
        {"role":"system","content":`You are going to be given a JSON portfolio of a user. Reword components of this individuals portfolio where possible to include key words, or cater to the following job description. DO NOT LIE, DO NOT RENAME THINGS. You can reword descriptions/content if it is relevant, but do not add skills that you cannot reasonably deduce the user utilized. Reorder the json objects in each section to have the most relevant ones first. You should change descriptions to include keywords that are more relevant to the job where possible, assuming they would actually occur within said object. It should look not too far removed to the original. Make sure everything is written professionally, with correct sentence structure and capitalization, and draw attention to relevant skills, it should not be short but should not be long either. You are essentially creating this users perfect resume for this job using what they have done.\n You will send back the same JSON Structure, but also validate \"skills\" and rewrite it so it is an array of objects with \"name\" \"content\" attributes, and no array will have more than 4 objects, so drop the least relevant items. Job Description: ${jobDesc}`},
        {"role":"user","content":`${JSON.stringify(data, null, 2)}`}
      ],
      temperature: 0.5,
      max_tokens: 4096,
    });

    const jsonData = JSON.parse(response.choices[0].message.content);
    return jsonData;
  } catch (err) {
    console.log(err);
    return { message: `ERROR: ${err}`};
  }
}