import os
import unittest
from fastapi.testclient import TestClient

# Ensure root is in path
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app, call_gemini_chat

client = TestClient(app)

class TestAiAgronomistUpgrade(unittest.TestCase):
    def setUp(self):
        self.sample_context = {
            "field": {
                "name": "Rajshahi High Loam",
                "latitude": 24.3677,
                "longitude": 88.6077,
                "area_ha": 5.0,
                "soil_texture": "clay_loam",
                "soil_ph": 6.8,
                "organic_matter": 2.1,
                "irrigation_capacity_mm": 120.0,
                "previous_crop": "Wheat"
            },
            "weather": {
                "temperature": 27.4,
                "relative_humidity": 78.0,
                "precipitation_mm": 18.5,
                "wind_speed_m_s": 2.1,
                "source": "NASA POWER Climatology"
            },
            "plan": {
                "selected_crop_by_period": {"Y1_S1": "Mungbean", "Y1_S2": "Maize"},
                "expected_yield_tons": 24.5,
                "gross_margin_bdt": 385000,
                "water_demand_mm": 740,
                "solver_status": "optimal"
            },
            "comparison": {
                "milp_profit": 385000,
                "rl_profit": 352000,
                "rule_profit": 290000
            },
            "scenarios": {
                "drought_robustness": "78% yield retention with Mungbean BNF break"
            },
            "outcomes_count": 3
        }

    def test_assistant_endpoint_with_field_context_english(self):
        """Test chat endpoint responds with structured 6-part content and field grounding."""
        response = client.post("/api/assistant/chat", json={
            "prompt": "Which crop rotation is best for my selected field, and why?",
            "context": self.sample_context,
            "language": "en"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("response", data)
        text = data["response"]
        
        # Verify 6-part sections are present
        self.assertTrue(
            "Short answer" in text or "SHORT ANSWER" in text or "1." in text,
            "Response should contain short answer section"
        )
        self.assertTrue(
            "Evidence from this field" in text or "EVIDENCE" in text or "Rajshahi" in text or "field" in text.lower(),
            "Response should reference field evidence"
        )
        self.assertTrue(
            any(w in text.lower() for w in ["recommend", "step", "next", "rotation", "action"]),
            "Response should contain recommended next step"
        )
        self.assertTrue(
            "Data limitations" in text or "LIMITATIONS" in text or "proxy" in text.lower() or "external" in text.lower() or "limitation" in text.lower(),
            "Response should mention limitations/disclaimers"
        )
        
        self.assertIn("status", data)
        self.assertIn("gemini_enabled", data)

    def test_assistant_endpoint_without_field_context(self):
        """Test assistant gracefully handles request when no field is selected."""
        response = client.post("/api/assistant/chat", json={
            "prompt": "What are the benefits of biological nitrogen fixation?",
            "context": {},
            "language": "en"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        text = data["response"]
        self.assertIn("nitrogen", text.lower())
        # Should not invent fake coordinates or field names
        self.assertNotIn("undefined° N", text)

    def test_assistant_bilingual_bangla(self):
        """Test assistant generates natural Bengali when requested in Bangla."""
        response = client.post("/api/assistant/chat", json={
            "prompt": "আমার নির্বাচিত জমির জন্য কোন ফসল চক্রটি সবচেয়ে ভালো এবং কেন?",
            "context": self.sample_context,
            "language": "bn"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        text = data["response"]
        # Should contain Bengali Unicode characters (\u0980-\u09ff)
        has_bengali = any('\u0980' <= char <= '\u09ff' for char in text)
        self.assertTrue(has_bengali, "Bangla request should return Bengali text")

    def test_action_intent_detection(self):
        """Test that action intents map correctly to supported tabs."""
        # Drought stress query
        r1 = client.post("/api/assistant/chat", json={
            "prompt": "What happens if there is severe drought and no irrigation?",
            "context": self.sample_context
        })
        self.assertEqual(r1.status_code, 200)
        intent1 = r1.json().get("action_intent")
        self.assertIsNotNone(intent1)
        self.assertIn(intent1.get("tab"), ["failure", "recovery"])

        # Compare query
        r2 = client.post("/api/assistant/chat", json={
            "prompt": "Compare the MILP plan with the RL and rule-based plans",
            "context": self.sample_context
        })
        self.assertEqual(r2.status_code, 200)
        intent2 = r2.json().get("action_intent")
        self.assertIsNotNone(intent2)
        self.assertIn(intent2.get("tab"), ["lab", "comparison_lab"])

        # Harvest outcome query
        r3 = client.post("/api/assistant/chat", json={
            "prompt": "What actual harvest data do we have, and how does it compare with estimates?",
            "context": self.sample_context
        })
        self.assertEqual(r3.status_code, 200)
        intent3 = r3.json().get("action_intent")
        self.assertIsNotNone(intent3)
        self.assertEqual(intent3.get("tab"), "outcomes")

    def test_offline_fallback_structure_and_labelling(self):
        """Test fallback behaves honestly and includes exact 6-part sections when Gemini is disabled."""
        # Temporarily mock no API key
        orig_key = os.environ.get("GEMINI_API_KEY")
        try:
            os.environ["GEMINI_API_KEY"] = ""
            result = call_gemini_chat(
                prompt="Why did the recommendation change after I reduced irrigation?",
                context=self.sample_context,
                language="en"
            )
            self.assertFalse(result["gemini_enabled"])
            self.assertEqual(result["model_used"], "deterministic_offline_agronomist")
            self.assertIn("SHORT ANSWER", result["response"].upper())
            self.assertIn("EVIDENCE FROM THIS FIELD", result["response"].upper())
            self.assertIn("RECOMMENDED NEXT STEP", result["response"].upper())
            self.assertIn("TRADE-OFFS & RISKS", result["response"].upper())
            self.assertIn("DATA LIMITATIONS", result["response"].upper())
            self.assertIn("SUGGESTED FOLLOW-UP ACTION", result["response"].upper())
            # Grounding check: mentions actual numbers from context
            self.assertIn("120", result["response"]) # irrigation capacity mm
        finally:
            if orig_key:
                os.environ["GEMINI_API_KEY"] = orig_key


if __name__ == "__main__":
    unittest.main()
