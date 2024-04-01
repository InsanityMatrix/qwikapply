import { useState } from 'react';

export default function Home() {
    const [jobDescription, setJobDescription] = useState('');
    // Adding state to store the parsed resume data
    const [resumeData, setResumeData] = useState(null);
  
    const handleSubmit = async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const file = formData.get('resume');
      const jobDesc = formData.get('jobDescription');
  
      // Use FileReader to read the file content
      const reader = new FileReader();
      reader.onload = async (e) => { 
        try {
          const text = e.target.result;
          const json = JSON.parse(text);

          const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resume: json, jobDescription: jobDesc }),
          });
    
          if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = "customized_resume.docx"; // Set the default filename for the download
            document.body.appendChild(link); // Append to the document
            link.click(); // Programmatically click the link to trigger the download
            link.remove(); // Clean up
          } else {
            console.error("Server responded with non-OK status");
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
          // Handle error (e.g., show an error message to the user)
        }
      };
      reader.readAsText(file);
    };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold text-blue-600 mb-8">QwikApply</h1>
      <p className="mb-6 text-lg text-gray-600">Tailor Your Resume in Seconds</p>
      
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="flex flex-col mb-4">
          <label htmlFor="resume" className="mb-2 text-sm font-bold text-gray-700">Upload Resume JSON</label>
          <input id="resume" type="file" name="resume" accept=".json" className="form-input px-4 py-2 border rounded" required />
        </div>
        <div className="flex flex-col mb-6">
          <label htmlFor="jobDescription" className="mb-2 text-sm font-bold text-gray-700">Job Description</label>
          <textarea
            id="jobDescription"
            name="jobDescription"
            rows="5"
            className="form-textarea mt-1 block w-full border rounded px-4 py-2"
            placeholder="Paste the job description here..."
            required
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Customize My Resume
        </button>
      </form>
    </div>
  );
}