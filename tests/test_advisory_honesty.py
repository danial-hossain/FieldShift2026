"""Test suite for Phase 1: Advisory must never overstate evidence."""

import os
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from src.compute.advisory_service import (
    DISTRICT_REGISTRY,
    build_planting_advisory,
)
from src.compute.agro import generate_recommendation

client = TestClient(app)


def test_1_rajshahi_aman_evidence_honesty():
    """1 rajshahi/aman: is_significant False; 'পিছিয়েছে' not in bangla_headline;
    'delay' not in english_headline.lower(); suggested_nursery_window_bn == '১৫ জুন – ৩০ জুন'."""
    advisory = build_planting_advisory("rajshahi", "aman", offline=True)
    comp = advisory["comparison"]
    rec = advisory["recommendation"]

    assert comp["is_significant"] is False
    assert "পিছিয়েছে" not in rec["bangla_headline"]
    assert "delay" not in rec["english_headline"].lower()
    assert rec["suggested_nursery_window_bn"] == "১৫ জুন – ৩০ জুন"
    assert rec["evidence_level"] == "not_significant"


def test_2_rajshahi_aman_censored_years():
    """2 rajshahi/aman: window_start_censored_years == [2001, 2002, 2006, 2017, 2018, 2019]."""
    advisory = build_planting_advisory("rajshahi", "aman", offline=True)
    comp = advisory["comparison"]
    assert comp["window_start_censored_years"] == [2001, 2002, 2006, 2017, 2018, 2019]


def test_3_mymensingh_aman_censored_fraction():
    """3 mymensingh/aman: censored_fraction > 0.30, status 'unreliable_window_censored',
    data_warning_bn present."""
    advisory = build_planting_advisory("mymensingh", "aman", offline=True)
    comp = advisory["comparison"]
    assert comp["censored_fraction"] > 0.30
    assert comp["status"] == "unreliable_window_censored"
    assert "data_warning_bn" in comp
    assert comp["data_warning_bn"] is not None
    assert len(comp["data_warning_bn"]) > 0


def test_4_synthetic_significant_delay_case_a():
    """4 generate_recommendation with synthetic comparison {is_significant: True,
    shift_days_median: 10, status: 'statistically_significant_delay', p_value: 0.01,
    n1: 12, n2: 13} -> delay message (case a still works)."""
    comp = {
        "is_significant": True,
        "shift_days_median": 10.0,
        "status": "statistically_significant_delay",
        "p_value": 0.01,
        "n1": 12,
        "n2": 13,
    }
    rec = generate_recommendation("rajshahi", "aman", comp, [], {})
    assert "পিছিয়েছে" in rec["bangla_headline"]
    assert "delay" in rec["english_headline"].lower()
    assert rec["evidence_level"] == "significant"
    assert "১০ দিন পিছিয়ে" in rec["bangla_headline"] or "10" in rec["english_headline"]


def test_5_unknown_district_raises_value_error():
    """5 build_planting_advisory('sylhet','aman') raises ValueError."""
    with pytest.raises(ValueError):
        build_planting_advisory("unknown_district_xyz", "aman", offline=True)


def test_6_api_unknown_district_returns_400():
    """6 GET /api/advisory?district=sylhet&crop=aman&offline=true -> 400 (FastAPI TestClient)."""
    response = client.get("/api/advisory?district=unknown_district_xyz&crop=aman&offline=true")
    assert response.status_code == 400


def test_7_rajshahi_boro_not_applicable():
    """7 rajshahi/boro: status 'not_applicable'."""
    advisory = build_planting_advisory("rajshahi", "boro", offline=True)
    assert advisory["status"] == "not_applicable"
    assert advisory["recommendation"]["status"] == "not_applicable"
    assert "বোরো সেচনির্ভর শুষ্ক মৌসুমের ধান" in advisory["recommendation"]["bangla_headline"]
    assert "Boro is irrigated dry-season rice" in advisory["recommendation"]["english_headline"]


def test_8_rajshahi_aus_sms_crop_name():
    """8 rajshahi/aus: 'আউশ' in bangla_sms and 'আমন' not in bangla_sms."""
    advisory = build_planting_advisory("rajshahi", "aus", offline=True)
    sms = advisory["recommendation"]["bangla_sms"]
    assert "আউশ" in sms
    assert "আমন" not in sms


def test_9_all_districts_crops_sms_length_and_name_bn():
    """9 all 6 districts x {aman, aus}: len(bangla_sms) <= 160 and name_bn in bangla_sms."""
    districts = list(DISTRICT_REGISTRY.keys())
    assert len(districts) == 64

    for dist_id in districts:
        name_bn = DISTRICT_REGISTRY[dist_id]["name_bn"]
        for crop_id in ["aman", "aus"]:
            advisory = build_planting_advisory(dist_id, crop_id, offline=True)
            sms = advisory["recommendation"]["bangla_sms"]
            assert len(sms) <= 160, f"SMS too long ({len(sms)} chars) for {dist_id} {crop_id}: {sms}"
            assert name_bn in sms, f"Bengali district name '{name_bn}' not found in SMS for {dist_id} {crop_id}: {sms}"


def test_10_dinajpur_and_satkhira_aman_censored_data_warning():
    """10 When Aman censored_fraction > 0.30, data_warning must appear (Dinajpur 36%, Satkhira 40%)."""
    for dist_id, min_frac in [("dinajpur", 0.35), ("satkhira", 0.38)]:
        advisory = build_planting_advisory(dist_id, "aman", offline=True)
        comp = advisory["comparison"]
        rec = advisory["recommendation"]

        assert comp["censored_fraction"] > 0.30
        assert comp["censored_fraction"] >= min_frac
        assert comp["status"] == "unreliable_window_censored"

        assert "data_warning_bn" in comp and comp["data_warning_bn"]
        assert "data_warning_en" in comp and comp["data_warning_en"]

        assert "data_warning_bn" in rec and rec["data_warning_bn"]
        assert "data_warning_en" in rec and rec["data_warning_en"]

        assert "data_warning_bn" in advisory and advisory["data_warning_bn"]
        assert "data_warning_en" in advisory and advisory["data_warning_en"]

        # Also verify API endpoint surfaces data_warning
        resp = client.get(f"/api/advisory?district={dist_id}&crop=aman&offline=true").json()
        assert resp["comparison"]["data_warning_bn"]
        assert resp["recommendation"]["data_warning_bn"]
        assert resp["data_warning_bn"]


