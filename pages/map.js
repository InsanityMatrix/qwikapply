import { useState, useEffect } from 'react';
import MappingInterface from '../components/MappingInterface';
import { useRouter } from 'next/router';

export default function MapJson() {
    const [jsonData, setJsonData] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const data = localStorage.getItem('mappingData');
        if (data) {
            setJsonData(JSON.parse(data));
            localStorage.removeItem('mappingData'); // Clean up
        }
    }, []);

    const handleMappingSubmit = (mappings) => {
        // Generate a new structured JSON object based on the mappings
        const newJsonData = {};

        for (const [jsonKey, docxField] of Object.entries(mappings)) {
            if (newJsonData.hasOwnProperty(docxField)) {
                if (!Array.isArray(newJsonData[docxField])) {
                    newJsonData[docxField] = [newJsonData[docxField]];
                }
                newJsonData[docxField].push(jsonData[jsonKey]);
            } else {
                // If it doesn't exist, simply assign the value
                newJsonData[docxField] = jsonData[jsonKey];
            }
        }

        // Convert the new JSON object to a string
        const jsonString = JSON.stringify(newJsonData, null, 2);

        // Create a blob from the JSON string
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a URL for the blob
        const url = URL.createObjectURL(blob);

        // Create an anchor element and simulate a click to trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'myportfolio.pflo';
        document.body.appendChild(a); // Required for this to work in FireFox
        a.click();
        a.remove(); // Clean up

        // Revoke the blob URL to free up resources
        URL.revokeObjectURL(url);
        router.push('/');
        
    };

    if (!jsonData) {
        return <div>Loading...</div>;
    }

    const jsonKeys = Object.keys(jsonData);
    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <MappingInterface jsonKeys={jsonKeys} onSubmitMappings={handleMappingSubmit} />
        </div>
    );
}