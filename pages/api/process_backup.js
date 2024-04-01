import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType, BorderStyle} from 'docx';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    let data = req.body.resume;
    let jobDesc = req.body.jobDescription;
    let pn = data.phone;
    let email = data.email;
    let addy = data.address;
    // Create the document
    const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: data.name,
                bold: true,
                alignment: AlignmentType.CENTER,
              }),
              new Table({
                columnWidths: [4500, 4500, 4500],
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({text: pn, alignment: AlignmentType.RIGHT})],
                        borders: {
                          top: {style: BorderStyle.NONE},
                          left: {style: BorderStyle.NONE},
                          bottom: {style: BorderStyle.NONE},
                          right: {style: BorderStyle.SINGLE},
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph({text: "Email", alignment: AlignmentType.CENTER})],
                        borders: {
                          top: {style: BorderStyle.NONE},
                          left: {style: BorderStyle.NONE},
                          bottom: {style: BorderStyle.NONE},
                          right: {style: BorderStyle.SINGLE},
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph({text: "Address", alignment: AlignmentType.LEFT})],
                        borders: {
                          top: {style: BorderStyle.NONE},
                          left: {style: BorderStyle.NONE},
                          bottom: {style: BorderStyle.NONE},
                          right: {style: BorderStyle.NONE},
                        },
                      }),
                    ],
                  }),
                  // Additional rows...
                ],
              }),
              // Project table...
              new Table({
                columnWidths: [4500, 4500],
                rows: [
                    ...data.projects.map(project => {
                        return [
                        new TableRow({
                            children: [
                            new TableCell({
                                children: [new Paragraph({text: project.title, alignment: AlignmentType.LEFT})],
                                colSpan: 3,
                                borders: {
                                top: {style: BorderStyle.NONE},
                                left: {style: BorderStyle.NONE},
                                bottom: {style: BorderStyle.NONE},
                                right: {style: BorderStyle.NONE},
                                },
                            }),
                            ],
                        }),
                        new TableRow({
                            children: [
                            new TableCell({
                                children: [new Paragraph({text: project.description, alignment: AlignmentType.LEFT})],
                                colSpan: 3,
                                borders: {
                                top: {style: BorderStyle.NONE},
                                left: {style: BorderStyle.NONE},
                                bottom: {style: BorderStyle.NONE},
                                right: {style: BorderStyle.NONE},
                                },
                            }),
                            ],
                        }),
                        ];
                    }).flat(),
                ],
              }),
            ],
          },
        ],
      });
  

    const buffer = await Packer.toBuffer(doc);

    // Set headers for a Word document file download
    res.setHeader('Content-Disposition', 'attachment; filename="resume.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Send the buffer in the response
    res.send(buffer);
  } else {
    // Only allow POST requests
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
