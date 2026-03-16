import uuid

from fastapi import APIRouter

from app.schemas.ai import (
    ChatRequest, ChatResponse,
    CommDraftRequest, CommDraftResponse,
    CompAnalysisRequest, CompAnalysisResponse,
    ListingRequest, ListingResponse,
)
from app.services.ai_assistant import assistant
from app.services.comm_drafter import draft_communication
from app.services.comp_analyzer import analyze_comps
from app.services.listing_generator import generate_listing

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    response = assistant.chat(messages)
    conversation_id = request.conversation_id or str(uuid.uuid4())
    return ChatResponse(response=response, conversation_id=conversation_id)


@router.post("/generate-listing", response_model=ListingResponse)
def gen_listing(request: ListingRequest):
    return generate_listing(request)


@router.post("/analyze-comps", response_model=CompAnalysisResponse)
def comp_analysis(request: CompAnalysisRequest):
    return analyze_comps(request)


@router.post("/draft-communication", response_model=CommDraftResponse)
def comm_draft(request: CommDraftRequest):
    return draft_communication(request)


@router.get("/usage")
def usage_stats():
    return assistant.usage.get_stats()
