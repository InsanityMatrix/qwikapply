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
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-blue-50">
  <div className="text-center bg-white shadow-md rounded-lg p-6 mb-4">
    <h1 className="text-5xl font-bold text-blue-700 mb-4">QwikApply</h1>
    <p className="mb-8 text-lg text-gray-600">Tailor Your Resume in Seconds</p>

    <div className="text-sm bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
      <p>Each resume generation costs me about $0.04. If you like my project, consider <a href="https://www.buymeacoffee.com/dvpiedra" className="font-bold underline">donating or buying me a coffee</a>!</p>
    </div>

    <button
      className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-full my-4 transition duration-300 ease-in-out"
      onClick={() => setShowModal(true)}
      disabled={isSubmittingFile}
    >
      Don't have a portfolio (.pflo)? Get one now!
    </button>
    
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
      <div className="flex flex-col mb-4">
        <label htmlFor="resume" className="mb-2 text-sm font-bold text-gray-700">Upload Portfolio! (.pflo)</label>
        <input id="resume" type="file" name="resume" accept=".pflo" className="form-input px-4 py-2 border rounded shadow-sm" required />
      </div>
      <div className="flex flex-col mb-6">
        <label htmlFor="jobDescription" className="mb-2 text-sm font-bold text-gray-700">Job Description</label>
        <textarea
          id="jobDescription"
          name="jobDescription"
          rows="5"
          className="form-textarea mt-1 block w-full border rounded px-4 py-2 shadow-sm"
          placeholder="Paste the job description here..."
          required
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>
      <button type="submit" className={`bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-full ${isSubmittingResume ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isSubmittingResume}>
        {isSubmittingResume ? 'Customizing...' : 'Customize My Resume'}
      </button>
    </form>
  </div>

  {showModal && (
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-5 rounded-lg shadow-lg">
        <h2 className="text-lg font-bold">Upload Your Document (.docx, .pdf)</h2>
        <form onSubmit={handleSubmitFile}>
          <input type="file" onChange={handleFileChange} accept=".pdf,.docx" className="my-3" />
          <button type="submit" className={`bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-full ${isSubmittingFile ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isSubmittingFile}>
            {isSubmittingFile ? 'Submitting...' : 'Submit'}
          </button>
          <button type="button" onClick={() => setShowModal(false)} className="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-full ml-2">
            Cancel
          </button>
        </form>
      </div>
    </div>
  )}
</div>

  );
}