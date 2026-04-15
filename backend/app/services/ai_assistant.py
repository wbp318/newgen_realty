from datetime import date

import anthropic
from fastapi import HTTPException

from app.config import settings
from app.prompts.system_prompts import AGENT_SYSTEM_PROMPT


class UsageTracker:
    """Tracks daily API usage to prevent runaway costs."""

    def __init__(self):
        self.reset()

    def reset(self):
        self.date = date.today()
        self.request_count = 0
        self.input_tokens = 0
        self.output_tokens = 0

    def check_and_increment(self):
        if date.today() != self.date:
            self.reset()
        if self.request_count >= settings.DAILY_REQUEST_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"Daily AI request limit ({settings.DAILY_REQUEST_LIMIT}) reached. Resets tomorrow.",
            )
        self.request_count += 1

    def record_tokens(self, input_tokens: int, output_tokens: int):
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens

    def get_stats(self) -> dict:
        if date.today() != self.date:
            self.reset()
        # Blended estimate (mix of Haiku $0.80/$4 and Sonnet $3/$15)
        est_cost = (self.input_tokens * 2 + self.output_tokens * 10) / 1_000_000
        return {
            "date": str(self.date),
            "requests_today": self.request_count,
            "daily_limit": settings.DAILY_REQUEST_LIMIT,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "estimated_cost_usd": round(est_cost, 4),
        }


class AIAssistant:
    def __init__(self):
        self._client = None
        self.model = settings.AI_MODEL
        self.usage = UsageTracker()

    @property
    def client(self):
        if self._client is None:
            self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._client

    def chat(
        self,
        messages: list[dict],
        system: str | None = None,
        max_tokens: int | None = None,
        model: str | None = None,
    ) -> str:
        self.usage.check_and_increment()
        response = self.client.messages.create(
            model=model or self.model,
            max_tokens=max_tokens or settings.MAX_TOKENS_CHAT,
            system=system or AGENT_SYSTEM_PROMPT,
            messages=messages,
        )
        self.usage.record_tokens(response.usage.input_tokens, response.usage.output_tokens)
        return response.content[0].text


assistant = AIAssistant()
