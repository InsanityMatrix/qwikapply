import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { OpenAI } from "openai";

const openai = new OpenAI();
export const config = {
    api: {
        bodyParser: false, // Disable the default body parser to use formidable
    },
};
export default async function handler(req, res) {
    const form = new IncomingForm({ keepExtensions: true });

    // Promise wrapper to handle the async formidable form parsing
    const data = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            console.log(files);
            resolve({ fields, files });
        });
    });

    // Check if a file is uploaded
    if (!data.files.document) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const file = data.files.document[0];
    let text = '';

    // Check the file type and parse accordingly
    if (file.mimetype === 'application/pdf') {
        // Parse PDF file
        text = await pdfParse(await fs.readFile(file.filepath)).then(data => data.text);
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Parse DOCX file
        text = await mammoth.extractRawText({ buffer: await fs.readFile(file.filepath) }).then(result => result.value);
    } else {
        return res.status(400).json({ error: `Unsupported file type.: ${file.mimetype}` });
    }
    try {
        let example = {
            profile: {
                name: "John Doe",
                address: "West Lafayette, IN 47906",
                phone: "(103) 558-2314",
                email: "johndoe@example.com"
            },
            college: {
                major: "BS in Cybersecurity",
                minor: "Artificial Intelligence",
                school: "Purdue University",
                location: "West Lafayette, IN",
                dates: "2022-2026"
            },
            certificates: [
                "name of certificate"
            ],
            skills: [
                {
                    name: "Programming Languages",
                    content: "Proficient in SQL, HTML, CSS, JavaScript, PHP"
                }
            ],
            interests: [
                {
                    name: "Efficient DB Design",
                    content: "Constructing efficient databases utilizing blah blah blah"
                }
            ],
            projects: [
                {
                    name: "Project Name",
                    description: "Project Description",
                    link: "an optional link to project info"
                }
            ],
            extracurriculars: [
                {
                    name: "Capture the Flags",
                    description: "Description of Capture the flags"
                }
            ],
            experiences: [
                {
                    company: "Company, Club, or whatever organizations name",
                    position: "Position Held - optional",
                    location: "Indianapolis, IN",
                    dates: "2022 - Present",
                    responsibilities: [
                        "bulleted list of responsibilities/achievements/descriptions"
                    ]
                }
            ],
            leadership: [
                {
                    name: "Company, Club, or whatever organizations name",
                    position: "Position Held - optional",
                    location: "Indianapolis, IN",
                    dates: "2022 - Present",
                    responsibilities: [
                        "bulleted list of responsibilities/achievements/descriptions"
                    ]
                }
            ]
        };
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            response_format: { "type": "json_object" },
            messages: [
                {"role":"system", "content": `You are going to be fed word documents or pdfs that I have parsed and converted to text. You will convert it into a portfolio written in JSON. You will only respond with the JSON, nothing else.  Some data name standards: Full name will always be \"name\", address will be \"address\", phone number will be \"phone\", email will be \"email\", all of those will be in an object called \"profile\" any links will be \"link\". For education it will be an object called college, within it it will include major, minor, school, location, and dates. For things with multiples, like Experiences, Certifications, Projects, etc... the JSON object will always be plural, and then you will a format each objects data as lowercase, some standards for Experiences would be: descriptions are always called responsibilities, and it is always an array, even if it is just one object. Project Objects always have a name and description, other things optional. Experience Objects will always call the position or title \"position\", and always call the place of experience \"company\". Extracurriculars will always be an array of \"name\", \"description\" objects. Any type of Skill will be in an array \"Skills\" and will have a \"name\" property and a \"content\" property. Here is an example structure: ${JSON.stringify(example)}. DO NOT LEAVE OUT ANY DATA, Most can be included somewhere.`},
                {"role": "user", "content": `${text}`}
            ],  
            temperature: 0.5,
            max_tokens: 4096,
        });
        console.log(response);
        const jsonData = JSON.parse(response.choices[0].message.content);
        const jsonString = JSON.stringify(jsonData, null, 2);
        //res.setHeader('Content-Disposition', 'attachment; filename=portfolio.pflo');
        res.setHeader('Content-Type', 'application/json');
        // Send the JSON string as the response
        res.status(200).send(jsonString);
        console.log(jsonString);
        } catch (error) {
        console.log(error)
        res.json({ message: "Error processing text with AI:" + error });
    }

};





