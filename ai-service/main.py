from __future__ import annotations

import os
from typing import List, Optional
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SyncTrace AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("BACKEND_URL", "http://localhost:4000")],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
model: Optional[SentenceTransformer] = None


@app.on_event("startup")
async def load_model() -> None:
    global model
    model = SentenceTransformer(MODEL_NAME)
    print(f"Model loaded: {MODEL_NAME}")


# --------------- Schemas ---------------

class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


class SimilarityRequest(BaseModel):
    text_a: str
    text_b: str


class SimilarityResponse(BaseModel):
    score: float  # 0.0 – 1.0


class ArtifactPair(BaseModel):
    upstream_type: str
    downstream_type: str
    upstream_text: str
    downstream_text: str


class GapDetectRequest(BaseModel):
    pairs: List[ArtifactPair]
    threshold_warn: float = 0.70
    threshold_fail: float = 0.55


class TracePair(BaseModel):
    upstream_snippet: str
    downstream_snippet: str
    similarity: float


class PairResult(BaseModel):
    upstream_type: str
    downstream_type: str
    alignment_score: float
    status: str  # PASS | WARN | FAIL
    evidence_pairs: List[TracePair]


class GapDetectResponse(BaseModel):
    results: List[PairResult]
    overall_score: float


# --------------- Endpoints ---------------

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    embeddings = model.encode(req.texts, normalize_embeddings=True)
    return EmbedResponse(embeddings=embeddings.tolist())


@app.post("/similarity", response_model=SimilarityResponse)
def similarity(req: SimilarityRequest) -> SimilarityResponse:
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    vecs = model.encode([req.text_a, req.text_b], normalize_embeddings=True)
    score = float(np.dot(vecs[0], vecs[1]))
    return SimilarityResponse(score=round(score, 4))


@app.post("/detect-gaps", response_model=GapDetectResponse)
def detect_gaps(req: GapDetectRequest) -> GapDetectResponse:
    """
    For each artifact pair, split texts into sentences, compute pairwise
    similarity, pick best matches, then compute an overall alignment score.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    results: List[PairResult] = []

    for pair in req.pairs:
        upstream_sentences = [s.strip() for s in pair.upstream_text.split(".") if len(s.strip()) > 20]
        downstream_sentences = [s.strip() for s in pair.downstream_text.split(".") if len(s.strip()) > 20]

        if not upstream_sentences or not downstream_sentences:
            results.append(PairResult(
                upstream_type=pair.upstream_type,
                downstream_type=pair.downstream_type,
                alignment_score=0.0,
                status="FAIL",
                evidence_pairs=[],
            ))
            continue

        up_vecs = model.encode(upstream_sentences, normalize_embeddings=True)
        dn_vecs = model.encode(downstream_sentences, normalize_embeddings=True)

        # Similarity matrix
        sim_matrix = np.dot(up_vecs, dn_vecs.T)

        # Pick top-3 best-matching pairs
        top_pairs: List[TracePair] = []
        for i in range(min(3, len(upstream_sentences))):
            best_dn = int(np.argmax(sim_matrix[i]))
            score = float(sim_matrix[i][best_dn])
            top_pairs.append(TracePair(
                upstream_snippet=upstream_sentences[i],
                downstream_snippet=downstream_sentences[best_dn],
                similarity=round(score, 4),
            ))

        alignment_score = float(np.mean([p.similarity for p in top_pairs]))
        status = "PASS" if alignment_score >= req.threshold_warn else (
            "WARN" if alignment_score >= req.threshold_fail else "FAIL"
        )

        results.append(PairResult(
            upstream_type=pair.upstream_type,
            downstream_type=pair.downstream_type,
            alignment_score=round(alignment_score, 4),
            status=status,
            evidence_pairs=top_pairs,
        ))

    overall_score = round(float(np.mean([r.alignment_score for r in results])) * 100, 1) if results else 0.0
    return GapDetectResponse(results=results, overall_score=overall_score)
