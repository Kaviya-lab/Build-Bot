import { useState, useRef } from "react";

const GEMINI_MODEL = "gemini-2.5-flash";

interface ComponentResult {
  component: string;
  confidence: string;
  description: string;
  specifications: string[];
  projects: { title: string; difficulty: string; description: string }[];
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<ComponentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setImageFile(file);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const analyzeImage = async () => {
    if (!image || !imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const base64 = image.split(",")[1];
      const mimeType = imageFile.type;

      const prompt = `You are an expert electronics engineer and educator. Analyze this image and identify the electronic component(s) shown.

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "component": "Component Name",
  "confidence": "High / Medium / Low",
  "description": "2-3 sentence description of what this component is and what it does",
  "specifications": ["spec 1", "spec 2", "spec 3", "spec 4"],
  "projects": [
    {
      "title": "Project Title",
      "difficulty": "Beginner / Intermediate / Advanced",
      "description": "One sentence about this project"
    },
    {
      "title": "Project Title 2",
      "difficulty": "Beginner / Intermediate / Advanced",
      "description": "One sentence about this project"
    },
    {
      "title": "Project Title 3",
      "difficulty": "Beginner / Intermediate / Advanced",
      "description": "One sentence about this project"
    }
  ]
}

If you cannot identify an electronic component, set component to "Unknown Component" and still fill all fields with best guesses or general electronics info.`;

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mimeType, data: base64 } },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      const data = await response.json();
      console.log("Gemini response:", JSON.stringify(data, null, 2));
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed: ComponentResult = JSON.parse(clean);
      setResult(parsed);
    } catch (err) {
      setError("Failed to analyze image. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const difficultyColor: Record<string, string> = {
    Beginner: "#22c55e",
    Intermediate: "#f59e0b",
    Advanced: "#ef4444",
  };

  return (
    <div className="app">
      <header>
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">BuildBot</span>
          </div>
          <p className="tagline">Upload a component image — get instant info & project ideas</p>
        </div>
      </header>

      <main>
        <section className="upload-section">
          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""} ${image ? "has-image" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {image ? (
              <img src={image} alt="Uploaded component" className="preview-img" />
            ) : (
              <div className="drop-placeholder">
                <div className="drop-icon">📷</div>
                <p className="drop-title">Drop your component image here</p>
                <p className="drop-sub">or click to browse</p>
                <p className="drop-hint">Supports JPG, PNG, WebP</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {image && (
            <div className="action-row">
              <button className="btn-secondary" onClick={() => { setImage(null); setResult(null); setError(null); }}>
                Clear
              </button>
              <button className="btn-primary" onClick={analyzeImage} disabled={loading}>
                {loading ? <><span className="spinner" /> Analyzing...</> : "⚡ Identify Component"}
              </button>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </section>

        {loading && (
          <div className="loading-card">
            <div className="loading-pulse" />
            <p>Scanning component...</p>
          </div>
        )}

        {result && !loading && (
          <div className="results">
            <div className="result-header">
              <div className="component-badge">
                <span className="component-name">{result.component}</span>
                <span className={`confidence confidence-${result.confidence.toLowerCase()}`}>
                  {result.confidence} Confidence
                </span>
              </div>
              <p className="component-desc">{result.description}</p>
            </div>

            <div className="card">
              <h3 className="card-title">📋 Specifications</h3>
              <ul className="spec-list">
                {result.specifications.map((spec, i) => (
                  <li key={i} className="spec-item">
                    <span className="spec-dot" />
                    {spec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h3 className="card-title">🔧 Project Ideas</h3>
              <div className="projects-grid">
                {result.projects.map((proj, i) => (
                  <div key={i} className="project-card">
                    <div className="project-top">
                      <span className="project-num">0{i + 1}</span>
                      <span
                        className="project-diff"
                        style={{ color: difficultyColor[proj.difficulty] || "#94a3b8" }}
                      >
                        {proj.difficulty}
                      </span>
                    </div>
                    <h4 className="project-title">{proj.title}</h4>
                    <p className="project-desc">{proj.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="examples">
            <p className="examples-label">Detects components like</p>
            <div className="chips">
              {["Resistor", "Capacitor", "LED", "Arduino", "Breadboard", "Transistor", "Diode", "IC Chip", "Relay", "Potentiometer", "Inductor", "Crystal Oscillator"].map((c) => (
                <span key={c} className="chip">{c}</span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}