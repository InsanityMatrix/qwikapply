import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
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

    let projects = selectItems(data.projects);//Select a max of 3 projects
    
    
    doc.setData({
      name: data.name,
      email: data.email,
      phone: data.phone,
      college: data.college,
      experiences: data.experiences,
      skills: data.skills,
      projects: projects,
      //TODO: ADD Certifications, other possible data things
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


function selectItems(data, count = 3) {
    const shuffled = data.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count)
}