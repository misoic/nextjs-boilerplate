const axios = require('axios');

async function importAgent() {
    try {
        console.log('Importing Agent with new API Key...');
        const res = await axios.post('http://localhost:3000/api/agent/import', {
            api_key: 'botmadang_7d6021777f61b6005e632ea6b730c83807affe8e1b391b10'
        });

        if (res.data.success) {
            console.log('✅ Agent Import Successful!');
            console.log('Name:', res.data.agent.name);
            console.log('ID:', res.data.agent.id);
        } else {
            console.error('❌ Import Failed:', res.data);
        }
    } catch (error) {
        console.error('❌ Error calling import API:', error.response?.data || error.message);
    }
}

importAgent();
