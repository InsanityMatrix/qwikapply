export class Llamapi {
    constructor(endpoint) {
      this.endpoint = endpoint;
    }
  
    async prompt({ prompt, stream = false }, outputCallback) {
      const controller = new AbortController();
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            stream: stream
          }),
          signal: controller.signal
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
  
        if (stream) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';
  
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const decodedChunk = decoder.decode(value, { stream: true });
            buffer += decodedChunk;
  
            let parts = buffer.split('\ndata:');
            buffer = parts.pop(); // Retain last incomplete part
  
            parts.forEach(part => {
              let cleanedPart = part.replace(/^data:\s*/, '').trim();
              if (cleanedPart) {
                try {
                  const jsonData = JSON.parse(cleanedPart);
                  if (jsonData.stop === false) {
                    outputCallback(jsonData.content);
                  }
                } catch (err) {
                  console.error(`Error parsing JSON part: ${err.message}`);
                }
              }
            });
          }
          
          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const jsonData = JSON.parse(buffer.replace(/^data:\s*/, '').trim());
              if (jsonData.stop === false) {
                outputCallback(jsonData.content);
              }
            } catch (err) {
              console.error(`Error parsing final JSON part: ${err.message}`);
            }
          }
        } else {
          return response.json();
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        controller.abort();
        outputCallback("[[[[[STOP]]]]]");
      }
    }

    fixJson(jsonString) {
        // Fix missing double quotes around keys or string values
        jsonString = jsonString.replace(/([\{\s,])(\w+)(:)/g, '$1"$2"$3');
        jsonString = jsonString.replace(/:\s*(\w+)([,\s}])/g, ': "$1"$2');
    
        // Ensure proper closing of opened brackets and braces
        const openBrackets = {'{': '}', '[': ']'};
        const stack = [];
        let fixedJson = '';
        for (let char of jsonString) {
            if (openBrackets[char]) {
                stack.push(openBrackets[char]);
                fixedJson += char;
            } else if (stack.length > 0 && char === stack[stack.length - 1]) {
                stack.pop();
                fixedJson += char;
            } else {
                fixedJson += char;
            }
        }
    
        // Close any unclosed brackets or braces
        while (stack.length > 0) {
            fixedJson += stack.pop();
        }
    
        return fixedJson;
    }
      
}
  