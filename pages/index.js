import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {InformationCircleIcon } from '@heroicons/react/outline';
import toast, { Toaster } from 'react-hot-toast';
export default function Home() {
    const [jobDescription, setJobDescription] = useState('');
    const [resumeData, setResumeData] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [jfile, setFile] = useState(null);
    const [isSubmittingResume, setIsSubmittingResume] = useState(false);
    const [isSubmittingFile, setIsSubmittingFile] = useState(false); 
    const [progress, setProgress] = useState(0);
    const [isHoveringInfo , setIsHoveringInfo] = useState(false);
    const router = useRouter();
    
    useEffect(() => {
      let intervalId;
      if (isSubmittingResume || isSubmittingFile) {
        const duration = isSubmittingResume ? 30000 + Math.random() * 20000 : 20000 +Math.random() * 10000; // 20-30s for resume, 30-60s for file
        const stepDuration = duration / 100;
        
        setProgress(0); // Reset progress at the start
        intervalId = setInterval(() => {
          setProgress((oldProgress) => {
            if (oldProgress < 100) {
              return oldProgress + 1;
            }
            clearInterval(intervalId); // Clear interval if progress is complete
            return 100;
          });
        }, stepDuration);
      }

      return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, [isSubmittingResume, isSubmittingFile]);

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

          const response = await fetch('/api/lprocess', {
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
            toast.success('Your resume has been generated!');
          } else if (response.status === 429) {
            toast.error('Your IP has made a request within the past minute. Please slow down.');
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
            //Old was /api/genportfolio
            const response = await fetch('/api/localGenPortfolio', {
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
  <div
        className="absolute top-4 left-4"
        onMouseEnter={() => setIsHoveringInfo(true)}
        onMouseLeave={() => setIsHoveringInfo(false)}
      >
        <InformationCircleIcon className="h-6 w-6 text-blue-700 cursor-pointer" />
        {isHoveringInfo && (
          <div className="mt-2 w-64 p-4 bg-white border border-gray-200 rounded shadow-lg">
            <p className="text-sm text-gray-600">This website does not save any data you submit to it.</p>
          </div>
        )}
      </div>
      <Toaster
        position="top-right"
        reverseOrder={false}
      />
  <div className="text-center bg-white shadow-md rounded-lg p-6 mb-4">
    <h1 className="text-5xl font-bold text-blue-700 mb-4">QwikApply</h1>
    <p className="mb-8 text-lg text-gray-600">Tailor Your Resume in Seconds</p>

    <div className="text-sm bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
      <p>Each resume generation is now locally ran, with no external APIs! Collecting bad and results helps improve future generations, so feel free to <a href="mailto:dvpiedra1@outlook.com" className="font-bold underline">email me with your results</a>!</p>
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
      {isSubmittingResume ? (
          <div className="w-full max-w-lg bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        ) : null}
    </form>
  </div>

  {showModal && (
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-5 rounded-lg shadow-lg">
        <h2 className="text-lg font-bold">Upload Your Document (.docx, .pdf)</h2>
        <p className="text-sm text-gray-600 mt-2 mb-4">
          To ensure I can tailor your resume as accurately as possible, please include as much relevant information as you can. The more details you provide, the better I can customize your resume to match your ideal job description!
        </p>
        <form onSubmit={handleSubmitFile}>
          <input type="file" onChange={handleFileChange} accept=".pdf,.docx" className="my-3" />
          <div className="flex justify-end space-x-2">
            <button type="submit" className={`bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-full ${isSubmittingFile ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isSubmittingFile}>
              {isSubmittingFile ? 'Submitting...' : 'Submit'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="bg-white-600 hover:bg-white-800 text-black font-bold py-2 px-4 rounded-full border-solid border-2">
              Cancel
            </button>
          </div>
        </form>
        {isSubmittingFile ? (
          <div className="w-full max-w-lg bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        ) : null}
      </div>
    </div>
  )}
  
</div>

  );
}