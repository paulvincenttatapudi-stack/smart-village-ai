import pytest


class TestDemoSimulation:
    """Tests for the Complaint Lifecycle Simulator demo endpoint."""

    @pytest.mark.asyncio
    async def test_simulate_returns_200(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Large pothole on Main Road near school",
            "description": "There is a dangerous pothole on Main Road near the primary school. It is approximately 2 feet wide and causes traffic jams during peak hours.",
            "village": "Rampur",
            "district": "Sitapur",
        })
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_simulate_returns_complaint_id(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Broken streetlight on Hospital Road",
            "description": "All streetlights on the road leading to Civil Hospital have been non-functional for 2 weeks creating safety concerns.",
            "village": "Rampur",
            "district": "Sitapur",
        })
        data = response.json()
        assert "complaint_id" in data
        assert data["complaint_id"].startswith("SV")

    @pytest.mark.asyncio
    async def test_simulate_returns_six_stages(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Contaminated water supply in Ward 5",
            "description": "The water supply in Ward 5 has been contaminated for the past 3 days. Residents are reporting stomach illnesses.",
            "village": "Khandra",
            "district": "Sitapur",
        })
        data = response.json()
        assert len(data["stages"]) == 6

    @pytest.mark.asyncio
    async def test_simulate_stages_have_correct_keys(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Garbage dumping near water tank",
            "description": "Illegal garbage dumping is happening near the community water tank creating health hazards.",
            "village": "Milkipur",
            "district": "Sitapur",
        })
        data = response.json()
        expected_stages = ["submitted", "ai_analysis", "duplicate_check", "auto_assign", "in_progress", "resolved"]
        actual_stages = [s["stage"] for s in data["stages"]]
        assert actual_stages == expected_stages

    @pytest.mark.asyncio
    async def test_simulate_ai_analysis_has_features(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Major road crack on highway",
            "description": "A large crack has appeared on the highway connecting two villages. It is widening and vehicles are being diverted.",
            "village": "Rampur",
            "district": "Sitapur",
        })
        data = response.json()
        ai_stage = data["stages"][1]
        assert ai_stage["stage"] == "ai_analysis"
        assert len(ai_stage["ai_features"]) == 4
        feature_names = [f["name"] for f in ai_stage["ai_features"]]
        assert "Category Classification" in feature_names
        assert "Priority Prediction" in feature_names
        assert "Department Routing" in feature_names
        assert "Summary Generation" in feature_names

    @pytest.mark.asyncio
    async def test_simulate_features_have_confidence(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Electrical wire sparking near market",
            "description": "An electrical wire is sparking near the main market creating fire hazards. Several shops are at risk.",
            "village": "Rampur",
            "district": "Sitapur",
        })
        data = response.json()
        for stage in data["stages"]:
            for feature in stage["ai_features"]:
                assert 0 <= feature["confidence"] <= 1
                assert feature["processing_ms"] > 0

    @pytest.mark.asyncio
    async def test_simulate_requires_title(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "description": "Some description that is long enough",
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_simulate_requires_description(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Some title that is long enough",
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_simulate_title_too_short(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Hi",
            "description": "This is a valid description that meets minimum length requirements for the complaint.",
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_simulate_description_too_short(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Valid complaint title here",
            "description": "Short",
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_simulate_total_processing_ms_positive(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Water pipe burst in village center",
            "description": "A major water pipe has burst in the village center flooding the streets and contaminating the local water supply.",
            "village": "Rampur",
            "district": "Sitapur",
        })
        data = response.json()
        assert data["total_processing_ms"] > 0

    @pytest.mark.asyncio
    async def test_simulate_duplicate_check_stage(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Pothole near bus stand",
            "description": "Large pothole near the main bus stand causing accidents. Multiple complaints expected.",
            "village": "Rampur",
            "district": "Sitapur",
        })
        data = response.json()
        dup_stage = data["stages"][2]
        assert dup_stage["stage"] == "duplicate_check"
        assert len(dup_stage["ai_features"]) == 1
        assert "is_duplicate" in dup_stage["ai_features"][0]["result"]

    @pytest.mark.asyncio
    async def test_simulate_auto_assign_stage(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": " Fallen tree blocking main road",
            "description": "A large tree has fallen blocking the main road. No traffic can pass. Emergency clearing required immediately.",
            "village": "Rampur",
            "district": "Sitapur",
        })
        data = response.json()
        assign_stage = data["stages"][3]
        assert assign_stage["stage"] == "auto_assign"
        assert len(assign_stage["ai_features"]) == 1
        assert "officer" in assign_stage["ai_features"][0]["result"]

    @pytest.mark.asyncio
    async def test_simulate_default_village_district(self, async_client):
        response = await async_client.post("/api/demo/simulate", json={
            "title": "Public toilet not working in ward 3",
            "description": "The public toilet facility in ward 3 has been non-functional for a month. It needs immediate repair and maintenance.",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["stages"][0]["description"].startswith("Citizen filed complaint")


class TestDemoStats:
    """Tests for the demo stats endpoint."""

    @pytest.mark.asyncio
    async def test_demo_stats_returns_200(self, async_client):
        response = await async_client.get("/api/demo/stats")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_demo_stats_has_ai_features(self, async_client):
        response = await async_client.get("/api/demo/stats")
        data = response.json()
        assert "ai_features" in data
        assert len(data["ai_features"]) == 6
        names = [f["name"] for f in data["ai_features"]]
        assert "Category Classification" in names
        assert "Priority Prediction" in names

    @pytest.mark.asyncio
    async def test_demo_stats_features_have_accuracy(self, async_client):
        response = await async_client.get("/api/demo/stats")
        data = response.json()
        for feature in data["ai_features"]:
            assert "name" in feature
            assert "accuracy" in feature
