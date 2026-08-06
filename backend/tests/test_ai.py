import pytest
from app.services.ai_service import AIService
from app.models.complaint import Complaint


@pytest.fixture
def ai_service():
    return AIService()


class TestClassify:
    @pytest.mark.asyncio
    async def test_classify_complaint(self, ai_service):
        category, confidence = await ai_service.classify_complaint(
            "Test title", "Test description"
        )
        assert category is not None
        assert isinstance(confidence, float)
        assert 0.0 <= confidence <= 1.0

    @pytest.mark.asyncio
    async def test_classify_pothole_road(self, ai_service):
        category, confidence = await ai_service.classify_complaint(
            "Pothole problem", "There is a large pothole on the main road near the market"
        )
        assert category == "road"
        assert confidence > 0.0

    @pytest.mark.asyncio
    async def test_classify_water_leak(self, ai_service):
        category, confidence = await ai_service.classify_complaint(
            "Water pipe burst", "Water pipe has burst near the school and water is leaking everywhere"
        )
        assert category == "water"
        assert confidence > 0.0

    @pytest.mark.asyncio
    async def test_classify_garbage(self, ai_service):
        category, confidence = await ai_service.classify_complaint(
            "Garbage dump", "Garbage waste is not being collected and trash is piling up on the street"
        )
        assert category == "sanitation"
        assert confidence > 0.0

    @pytest.mark.asyncio
    async def test_classify_electricity(self, ai_service):
        category, confidence = await ai_service.classify_complaint(
            "Power outage", "Street light pole is broken and electricity wires are hanging dangerously"
        )
        assert category == "electricity"
        assert confidence > 0.0


class TestDetectDuplicate:
    @pytest.mark.asyncio
    async def test_detect_duplicate_similar(self, ai_service):
        existing = [
            Complaint(
                id=1,
                complaint_id="SV123456",
                title="Pothole on Main Road",
                description="Large pothole on Main Road near the market causing traffic",
                user_id=1,
                address="Main Road",
                ward_number=1,
                village="Test",
                district="Test",
            )
        ]
        is_dup, score, match = await ai_service.detect_duplicate(
            "Pothole on road",
            "Large pothole on Main Road near the market",
            existing,
        )
        assert is_dup is True
        assert score > 0.5

    @pytest.mark.asyncio
    async def test_detect_duplicate_different(self, ai_service):
        existing = [
            Complaint(
                id=1,
                complaint_id="SV123456",
                title="Water pipe burst",
                description="Water pipe burst in residential area",
                user_id=1,
                address="Residential Area",
                ward_number=1,
                village="Test",
                district="Test",
            )
        ]
        is_dup, score, match = await ai_service.detect_duplicate(
            "Pothole on road",
            "Large pothole on Main Road near the market",
            existing,
        )
        assert is_dup is False
        assert score < 0.3


class TestSummary:
    @pytest.mark.asyncio
    async def test_generate_summary(self, ai_service):
        summary = await ai_service.generate_summary(
            "Test title",
            "This is a long description that should be summarized by the AI service into a shorter version."
            * 5,
        )
        assert isinstance(summary, str)
        assert len(summary) > 0
        assert summary.endswith("...")
