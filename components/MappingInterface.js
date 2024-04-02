import React, { useState, useEffect } from 'react';
const docxFields = ['Name', 'Address', 'Email', 'Phone', 'College', 'Projects', 'Leadership', 'Skills', 'Experience', 'Extracurriculars', 'Volunteering', 'Certificates', 'Interests' ];

const MappingInterface = ({ jsonKeys, onSubmitMappings }) => {
    const [mappings, setMappings] = useState({});

    useEffect(() => {
        // Initialize mappings by checking if jsonKeys have direct matches in docxFields
        const initialMappings = jsonKeys.reduce((acc, key) => {
            // Normalize keys and docxFields for comparison, assuming case-insensitive match is desired
            const normalizedKey = key.toLowerCase();
            const match = docxFields.find((field) => field.toLowerCase() === normalizedKey);

            if (match) {
                // If a match is found, add to mappings
                acc[key] = match;
            }

            return acc;
        }, {});

        setMappings(initialMappings);
    }, [jsonKeys, docxFields]);

    const handleSelectChange = (jsonKey, docxField) => {
        setMappings({ ...mappings, [jsonKey]: docxField });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmitMappings(mappings);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4 bg-white p-6 rounded-lg shadow max-w-4xl mx-auto">
            <table className="table-fixed w-full text-left">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="px-4 py-2">JSON Key</th>
                        <th className="px-4 py-2">Map to DOCX Field</th>
                    </tr>
                </thead>
                <tbody>
                    {jsonKeys.map((key, index) => (
                        <tr key={key} className={index % 2 === 0 ? 'bg-gray-100' : ''}>
                            <td className="border px-4 py-2">{key}</td>
                            <td className="border px-4 py-2">
                                <select
                                    onChange={(e) => handleSelectChange(key, e.target.value)}
                                    value={mappings[key] || ''}
                                    className="form-select block w-full mt-1 border-gray-300 shadow-sm rounded-md"
                                >
                                    <option value="">Select a field</option>
                                    {docxFields.map((field) => (
                                        <option key={field} value={field}>
                                            {field}
                                        </option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Generate DOCX
            </button>
        </form>
    );
};

export default MappingInterface;