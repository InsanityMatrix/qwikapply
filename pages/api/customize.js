export default function handler(req, res) {
    if (req.method === 'POST') {
      // Placeholder for processing logic
      console.log(req.body);
      // Respond with a success message or the customized resume
      res.status(200).json({ message: 'Resume customization in progress' });
    } else {
      // Handle any other HTTP method
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }