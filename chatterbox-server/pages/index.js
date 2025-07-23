export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Chatterbox TTS Server</h1>
      <p>This server provides TTS functionality using the Gradio Chatterbox client.</p>
      <h2>API Endpoints:</h2>
      <ul>
        <li>
          <strong>POST /api/generate-tts</strong> - Generate TTS audio
          <pre style={{ background: '#f5f5f5', padding: '1rem', marginTop: '0.5rem' }}>
{`{
  "text_input": "Your text here",
  "exaggeration_input": 0.5,
  "temperature_input": 0.8,
  "seed_num_input": 0,
  "cfgw_input": 0.5
}`}
          </pre>
        </li>
      </ul>
      <p>Server is running on port 3001</p>
    </div>
  );
}
