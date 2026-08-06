from loguru import logger

CATEGORY_KEYWORDS = {
    "road": ["road", "pothole", "street", "pathway", "speed breaker", "culvert", "footpath", "pavement"],
    "water": ["water", "pipe", "leak", "drainage", "flood", "sewage", "borewell", "supply", "tank"],
    "electricity": ["electricity", "power", "light", "pole", "transformer", "wire", "voltage", "current"],
    "garbage": ["garbage", "waste", "clean", "dump", "litter", "trash", "bin", "rubbish", "debris"],
    "sewage": ["sewage", "drain", "toilet", "septic", "manhole", "overflow", "stench", "blocked drain"],
    "streetlight": ["streetlight", "lamp", "light pole", "street light", "dark", "illumination"],
    "tree_fallen": ["tree", "fallen", "branch", "uprooted", "trunk", "timber", "foliage"],
    "construction": ["construction", "building", "digging", "excavation", "demolition", "site"],
    "pest_control": ["pest", "mosquito", "insect", "cockroach", "rodent", "rat", "termite", "fumigation"],
    "animal": ["animal", "stray", "cattle", "cow", "dog", "monkey", "snake", "menace"],
    "other": [],
}

PRIORITY_KEYWORDS = {
    "critical": [
        "accident", "collapse", "fire", "burst", "emergency", "gas leak",
        "electric shock", "explosion", "flooding", "injury", "death",
    ],
    "high": [
        "major", "severe", "dangerous", "broken", "blocked", "overflow",
        "leakage", "urgent", "significant", "hazard", "unsafe",
    ],
    "medium": [
        "damage", "need", "repair", "fix", "replace", "issue", "problem",
        "complaint", "defective", "malfunction", "disruption",
    ],
    "low": [
        "suggestion", "request", "improvement", "minor", "cosmetic",
        "inquiry", "information", "feedback", "enquiry",
    ],
}

DEPARTMENT_KEYWORDS = {
    "Public Works Department": ["road", "pothole", "bridge", "culvert", "building", "construction"],
    "Water Board": ["water", "pipe", "leak", "borewell", "supply", "drainage", "sewage"],
    "Electricity Board": ["electricity", "power", "light", "pole", "transformer", "wire", "voltage"],
    "Municipal Corporation": ["garbage", "waste", "streetlight", "dump", "sanitation", "park"],
    "Forest Department": ["tree", "forest", "timber", "wildlife", "animal", "fallen", "plantation"],
    "Health Department": ["health", "hospital", "clinic", "pest", "mosquito", "medical", "disease"],
}


def classify_text(text: str, keyword_dict: dict) -> tuple[str, float]:
    if not text:
        return ("other", 0.0)

    text_lower = text.lower()
    scores = {}
    for label, keywords in keyword_dict.items():
        if not keywords:
            scores[label] = 0.0
        else:
            score = sum(1 for kw in keywords if kw in text_lower)
            scores[label] = score

    best_label = max(scores, key=scores.get)
    total = sum(scores.values())

    if total == 0:
        return ("other", 0.0)

    confidence = round(scores[best_label] / total, 4)
    confidence = min(confidence, 1.0)

    return (best_label, confidence)
