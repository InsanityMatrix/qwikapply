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
                    content: "Constructing efficient databases"
                }
            ],
            projects: [
                {
                    name: "Project Name",
                    description: "Project Description",
                    link: "optional link to project info"
                }
            ],
            extracurriculars: [
                {
                    name: "Capture the Flags",
                    description: "Description of Capture the Flags"
                }
            ],
            experiences: [
                {
                    company: "Company, Club, or Organization",
                    position: "Position Held (optional)",
                    location: "Indianapolis, IN",
                    dates: "2022 - Present",
                    responsibilities: [
                        "list of responsibilities/achievements"
                    ]
                }
            ],
            leadership: [
                {
                    name: "Organization Name",
                    position: "Position Held (optional)",
                    location: "Indianapolis, IN",
                    dates: "2022 - Present",
                    responsibilities: [
                        "list of responsibilities/achievements"
                    ]
                }
            ]
        };

        let prompt = "";
        const System = `
        <|begin_of_text|><|start_header_id|>system<|end_header_id|>\n
        Convert parsed documents to JSON according to this structure:
        ${JSON.stringify(example)}.
        Include all available data in the appropriate fields, with minimal rewording. If no data is provided for a section, leave it blank. Ensure no duplication across sections. Respond only with JSON output. <|eot_id|>`;
        
        const User = "<|start_header_id|>user<|end_header_id|>\n" + `${text}` + "<|eot_id|>";
        const Assistant = "<|start_header_id|>assistant<|end_header_id|>\n";
        prompt = System + User + Assistant;

        let response = await fetch(process.env.LOCAL_LLM, {
            method: 'POST',
            body: JSON.stringify({
                prompt,
                /*grammar: `root   ::= object
                value  ::= object | array | string | number | ("true" | "false" | "null") ws
                object ::=
                    "{" ws (
                            string ":" ws value
                    ("," ws string ":" ws value)*
                    )? "}" ws
                array  ::=
                    "[" ws (
                            value
                    ("," ws value)*
                    )? "]" ws
                string ::=
                    "\\"" (
                    [^"\\\\\\x7F\\x00-\\x1F] |
                    "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F])
                    )* "\\"" ws
                number ::= ("-"? ([0-9] | [1-9] [0-9]*)) ("." [0-9]+)? ([eE] [-+]? [0-9]+)? ws
                ws ::= ([ \\t\\n] ws)?`, */
                temperature: 0.5,
            })
        });
        let output = await response;
        const rdata = await output.json();
        console.log("Response: " + rdata.content);
        try {
            const jsonData = JSON.parse(rdata.content);
            const jsonString = JSON.stringify(jsonData, null, 2);
            //res.setHeader('Content-Disposition', 'attachment; filename=portfolio.pflo');
            res.setHeader('Content-Type', 'application/json');
            // Send the JSON string as the response
            res.status(200).send(jsonString);
        } catch (error) {
            //AI didnt strictly grab json, get all contents between the ```json ```
            const start = rdata.content.indexOf('{');
            const end = rdata.content.lastIndexOf('}');

            const extractedContent = rdata.content.slice(start, end + 1);
            const jsonData = JSON.parse(extractedContent);
            const jsonString = JSON.stringify(jsonData, null, 2);

            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(jsonString);
        }
        } catch (error) {
        console.log(error)
        res.json({ message: "Error processing text with AI:" + error });
    }

};





