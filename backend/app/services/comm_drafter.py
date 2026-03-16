import re

from app.config import settings
from app.prompts.system_prompts import COMM_DRAFT_SYSTEM
from app.prompts.templates import COMM_DRAFT_TEMPLATE, MEDIUM_INSTRUCTIONS
from app.schemas.ai import CommDraftRequest, CommDraftResponse
from app.services.ai_assistant import assistant


def draft_communication(data: CommDraftRequest) -> CommDraftResponse:
    medium_instructions = MEDIUM_INSTRUCTIONS.get(data.medium, MEDIUM_INSTRUCTIONS["email"])

    prompt = COMM_DRAFT_TEMPLATE.format(
        medium=data.medium,
        recipient_name=data.recipient_name,
        purpose=data.purpose.replace("_", " "),
        context=data.context or "No additional context",
        tone=data.tone,
        medium_instructions=medium_instructions,
    )

    response = assistant.chat(
        messages=[{"role": "user", "content": prompt}],
        system=COMM_DRAFT_SYSTEM,
        max_tokens=settings.MAX_TOKENS_COMM,
    )

    subject = None
    body = response

    subject_match = re.search(r"SUBJECT:\s*(.+?)(?:\n|$)", response)
    body_match = re.search(r"BODY:\s*(.+)", response, re.DOTALL)

    if subject_match:
        subject = subject_match.group(1).strip()
    if body_match:
        body = body_match.group(1).strip()

    return CommDraftResponse(subject=subject, body=body)
