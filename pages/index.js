import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
    const [jobDescription, setJobDescription] = useState('');
    const [resumeData, setResumeData] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [jfile, setFile] = useState(null);
    const [isSubmittingResume, setIsSubmittingResume] = useState(false);
    const [isSubmittingFile, setIsSubmittingFile] = useState(false); 
    const router = useRouter();
    
    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      setIsSubmittingResume(true);
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
          setIsSubmittingResume(false);
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
            console.log(response);
            console.error("Server responded with non-OK status" + response.status + " " + response.statusText);
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
          setIsSubmittingResume(false);
          // Handle error (e.g., show an error message to the user)
        }
      };
      reader.readAsText(file);
    };


    const handleSubmitFile = async (event) => {
        event.preventDefault();
        setIsSubmittingFile(true);
        if (!jfile) {
            alert('Please select a file first.');
            setIsSubmittingFile(false);
            return;
        }

        const formData = new FormData();
        formData.append('document', jfile);

        try {
            const response = await fetch('/api/genportfolio', {
                method: 'POST',
                body: formData,
            });
            setIsSubmittingFile(false);
            if (response.ok) {
              const jsonData = await response.json(); // Assuming the server responds with JSON data
              localStorage.setItem('mappingData', JSON.stringify(jsonData)); // Temporarily store the data
              router.push('/map');
            } else {
                console.error("Server responded with non-OK status");
            }
        } catch (error) {
            console.error("Error submitting file:", error);
            setIsSubmittingFile(false);
        }
    };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold text-blue-600 mb-8">QwikApply</h1>
      <p className="mb-6 text-lg text-gray-600">Tailor Your Resume in Seconds</p>
      
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="flex flex-col mb-4">
          <label htmlFor="resume" className="mb-2 text-sm font-bold text-gray-700">Upload Portfolio! (.pflo)</label>
          <input id="resume" type="file" name="resume" accept=".pflo" className="form-input px-4 py-2 border rounded" required />
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
        <button type="submit" className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${isSubmittingResume ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isSubmittingResume}>
          {isSubmittingResume ? 'Customizing...' : 'Customize My Resume'}
        </button>
      </form>

      <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded my-4"
            onClick={() => setShowModal(true)}
            disabled={isSubmittingFile}
        >
            Don't have a portfolio? Get one now!
        </button>
        {showModal && (
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-5 rounded-lg">
                    <h2 className="text-lg font-bold">Upload Your Document</h2>
                    <form onSubmit={handleSubmitFile}>
                        <input type="file" onChange={handleFileChange} accept=".pdf,.docx" className="my-3" />
                        <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" disabled={isSubmittingFile}>
                        {isSubmittingFile ? 'Submitting...' : 'Submit'}
                        </button>
                        <button type="button" onClick={() => setShowModal(false)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ml-2">
                            Cancel
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}