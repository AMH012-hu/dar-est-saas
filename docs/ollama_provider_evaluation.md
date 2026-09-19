# Ollama Provider Evaluation

## Official references reviewed

| Topic | Finding | Source |
|---|---|---|
| Local API | Ollama serves its local API on `http://localhost:11434/api` after installation. A deployed web app cannot reach this endpoint unless an Ollama server is separately hosted and exposed securely. | https://docs.ollama.com/api/introduction |
| Conversational API | The chat API accepts an ordered array of messages and supports a JSON or JSON-schema response format, allowing a server to preserve turn context and request structured intent extraction. | https://docs.ollama.com/api/chat |
| Hosted alternative | Ollama Cloud can be accessed directly through ollama.com with an API key stored server-side, avoiding the need to self-host a local inference service. | https://docs.ollama.com/cloud |

## Implication for DAR.EST

The production site must not call a browser-local or sandbox-local Ollama address. A viable integration requires either: (1) a remote Ollama host behind authenticated HTTPS, or (2) Ollama Cloud with an `OLLAMA_API_KEY` held only by the server. Independently of provider choice, the application needs a server-side conversation-state contract that passes the immediately preceding authorized result set to the model and constrains it to return structured intent rather than inventing inventory results.
