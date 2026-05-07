from __future__ import annotations

import os
from typing import Optional

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

from .excel_io import (
    read_ai_risks,
    read_ai_controls,
    read_cyber_risks,
    read_nist_controls,
)

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "AI-Governance")


def _db():
    if not MONGODB_URI:
        return None
    return MongoClient(MONGODB_URI)[MONGODB_DB]


def _normalize_records(df: pd.DataFrame, library: str) -> list[dict]:
    records = []
    for row in df.to_dict(orient="records"):
      clean = {str(k).strip().lower().replace(" ", "_"): v for k, v in row.items()}
      clean["library"] = library
      records.append(clean)
    return records


def _upsert_library(collection_name: str, records: list[dict], id_fields: tuple[str, ...]) -> int:
    db = _db()
    if db is None or not records:
        return 0

    operations = []
    for record in records:
        key = None
        for field in id_fields:
            value = str(record.get(field, "")).strip()
            if value:
                key = value
                break
        if not key:
            continue
        record["key"] = key
        operations.append(
            UpdateOne(
                {"library": record["library"], "key": key},
                {"$set": record},
                upsert=True,
            )
        )

    if not operations:
        return 0

    result = db[collection_name].bulk_write(operations)
    return result.upserted_count + result.modified_count


def import_excel_libraries() -> dict:
    imported = {
        "ai_risks": _upsert_library(
            "risk_libraries",
            _normalize_records(read_ai_risks(), "ai"),
            ("risk_id", "risk"),
        ),
        "cyber_risks": _upsert_library(
            "risk_libraries",
            _normalize_records(read_cyber_risks(), "cyber"),
            ("risk_id", "category"),
        ),
        "ai_controls": _upsert_library(
            "control_libraries",
            _normalize_records(read_ai_controls(), "ai"),
            ("code", "control_id"),
        ),
        "nist_controls": _upsert_library(
            "control_libraries",
            _normalize_records(read_nist_controls(), "nist"),
            ("control_id", "code"),
        ),
    }
    return imported


def library_counts() -> dict:
    db = _db()
    if db is None:
        return {"mongo_connected": False}

    return {
        "mongo_connected": True,
        "ai_risks": db.risk_libraries.count_documents({"library": "ai"}),
        "cyber_risks": db.risk_libraries.count_documents({"library": "cyber"}),
        "ai_controls": db.control_libraries.count_documents({"library": "ai"}),
        "nist_controls": db.control_libraries.count_documents({"library": "nist"}),
    }


def _records_to_dataframe(records: list[dict]) -> Optional[pd.DataFrame]:
    if not records:
        return None
    for record in records:
        record.pop("_id", None)
        record.pop("key", None)
        record.pop("library", None)
    df = pd.DataFrame(records).fillna("")
    for column in list(df.columns):
        spaced = column.replace("_", " ")
        if spaced not in df.columns:
            df[spaced] = df[column]
    return df


def read_ai_risks_from_store() -> pd.DataFrame:
    db = _db()
    if db is not None:
        df = _records_to_dataframe(list(db.risk_libraries.find({"library": "ai"})))
        if df is not None:
            return df
    return read_ai_risks()


def read_cyber_risks_from_store() -> pd.DataFrame:
    db = _db()
    if db is not None:
        df = _records_to_dataframe(list(db.risk_libraries.find({"library": "cyber"})))
        if df is not None:
            return df
    return read_cyber_risks()


def read_ai_controls_from_store() -> pd.DataFrame:
    db = _db()
    if db is not None:
        df = _records_to_dataframe(list(db.control_libraries.find({"library": "ai"})))
        if df is not None:
            return df
    return read_ai_controls()


def read_nist_controls_from_store() -> pd.DataFrame:
    db = _db()
    if db is not None:
        df = _records_to_dataframe(list(db.control_libraries.find({"library": "nist"})))
        if df is not None:
            return df
    return read_nist_controls()
