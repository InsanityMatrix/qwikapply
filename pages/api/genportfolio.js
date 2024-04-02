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
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            response_format: { "type": "json_object" },
            messages: [
                {"role":"system", "content": "You are going to be fed word documents or pdfs that I have parsed and converted to text. You will convert it into a portfolio written in JSON. You will only respond with the JSON, nothing else.  Some data name standards: Full name will always be \"name\", address will be \"address\", phone number will be \"phone\", email will be \"email\", any links will be \"link\". For education it will be an object called college, within it it will include major, minor, school, location, and dates. For things with multiples, like Experiences, Certifications, Projects, etc... you will always capitalize the first letter of the name of the array, and then you will a format each objects data as lowercase."},
                {"role": "user", "content": `${text}`}
            ],  
            temperature: 0.5,
            max_tokens: 2048,
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





