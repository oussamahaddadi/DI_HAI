import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure JSON and body/file limits
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // API Route: Extract student names from professional printed rosters using Gemini OCR
  app.post("/api/extract-names", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "L'image base64 est manquante." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "La clé d'API (GEMINI_API_KEY) n'est pas configurée sur le serveur." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: image
        }
      };

      const textPart = {
        text: "Tu es un assistant professeur d'EPS. Analyse cette image de liste d'appel ou d'évaluation d'élèves. " +
              "IMPORTANT : Cette liste est imprimée de manière dactylographiée (machine-printed) et non manuscrite. " +
              "Extrais tous les noms et prénoms d'élèves présents dans ce document imprimé de façon ordonnée. " +
              "Retourne UNIQUEMENT un tableau JSON structuré contenant la clé 'names' avec la liste des noms trouvés sous forme de chaînes de caractères. " +
              "Format attendu sans balisage Markdown : {\"names\": [\"Prénom Nom\", \"Prénom2 Nom2\"]}. Ne retourne rien d'autre que l'objet JSON brut valide."
      };

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      let response;
      let lastError;
      const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

      for (const modelName of modelsToTry) {
        let attempts = 3;
        for (let i = 0; i < attempts; i++) {
          try {
            console.log(`Tentative d'extraction avec le modèle : ${modelName} (essai ${i + 1}/${attempts})`);
            const attempt = await ai.models.generateContent({
              model: modelName,
              contents: [imagePart, textPart]
            });
            if (attempt && attempt.text) {
              response = attempt;
              console.log(`Extraction réussie avec le modèle : ${modelName}`);
              break;
            }
          } catch (err: any) {
            console.warn(`Échec d'utilisation du modèle ${modelName} à l'essai ${i + 1} :`, err.message || err);
            lastError = err;
            if (i < attempts - 1) {
              const waitTime = 1000 * (i + 1);
              console.log(`Attente de ${waitTime}ms avant de réclamer...`);
              await delay(waitTime);
            }
          }
        }
        if (response) break;
      }

      if (!response) {
        throw lastError || new Error("Tous les modèles de décodage sont actuellement indisponibles en raison d'une forte demande.");
      }

      const responseText = response.text || "";
      console.log("Response text:", responseText);

      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      }

      try {
        const parsed = JSON.parse(cleanJson);
        if (parsed && Array.isArray(parsed.names)) {
          return res.json({ names: parsed.names });
        } else {
          const arrays = Object.values(parsed).filter(v => Array.isArray(v));
          if (arrays.length > 0) {
            return res.json({ names: arrays[0] });
          }
        }
        throw new Error("Structure JSON invalide");
      } catch (parseErr) {
        const foundNames: string[] = [];
        const lines = responseText.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("}") || trimmed.startsWith("[") || trimmed.startsWith("]") || trimmed.includes("names")) continue;
          
          const cleanName = trimmed.replace(/^[-*•\d.\s"']+|[,"'\]\s]+$/g, "").trim();
          if (cleanName && cleanName.length > 1 && cleanName.length < 50) {
            foundNames.push(cleanName);
          }
        }
        if (foundNames.length > 0) {
          return res.json({ names: foundNames });
        }
        return res.status(500).json({ error: "Impossible d'extraire les prénoms de la réponse de l'IA.", raw: responseText });
      }

    } catch (err: any) {
      console.error("Error in /api/extract-names:", err);
      res.status(500).json({ error: err.message || "Une erreur est survenue lors de l'extraction." });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
}

startServer();
