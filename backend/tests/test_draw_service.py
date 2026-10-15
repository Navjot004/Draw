import json
import uuid
import pytest
from fastapi import HTTPException
from app.services.draw_service import DrawService
from app.models.student_pool import StudentPoolSnapshot
from app.models.draw import Draw
from app.models.draw_request import DrawRequest

def test_execute_draw_success(db_session, test_organizer, seeded_student_pool):
    key = str(uuid.uuid4())
    draw = DrawService.execute_draw(db_session, test_organizer, idempotency_key=key)

    assert draw.id is not None
    assert draw.winner_name.startswith("Student")
    assert draw.winner_reg_no.startswith("REG2024CS")
    assert draw.participant_count == 100
    assert draw.pool_hash == "testhash123456789"
    assert draw.organizer_id == test_organizer.id
    assert draw.status == "completed"

    # Verify persisted in database
    persisted = db_session.query(Draw).filter(Draw.id == draw.id).first()
    assert persisted is not None
    assert persisted.winner_name == draw.winner_name

    # Verify idempotency record persisted
    req = db_session.query(DrawRequest).filter(DrawRequest.idempotency_key == key).first()
    assert req is not None
    assert req.draw_id == draw.id

def test_idempotency_prevents_duplicate_draw(db_session, test_organizer, seeded_student_pool):
    key = "unique-idempotency-key-test-123"
    draw1 = DrawService.execute_draw(db_session, test_organizer, idempotency_key=key)
    
    # Second execution with exact same key must return original draw
    draw2 = DrawService.execute_draw(db_session, test_organizer, idempotency_key=key)

    assert draw1.id == draw2.id
    assert draw1.winner_name == draw2.winner_name
    assert draw1.winner_reg_no == draw2.winner_reg_no

    # Verify total draws in DB is still exactly 1
    total_draws = db_session.query(Draw).count()
    assert total_draws == 1

def test_unconfirmed_pool_rejected(db_session, test_organizer):
    pool = StudentPoolSnapshot(
        source="test",
        total_fetched=10,
        eligible_count=10,
        invalid_count=0,
        duplicate_count=0,
        pool_hash="unconfirmedhash",
        is_active=True,
        is_confirmed=False,  # NOT confirmed
        students_data=json.dumps([{"name": "A", "reg_no": "1"}]),
        validation_summary="{}"
    )
    db_session.add(pool)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        DrawService.execute_draw(db_session, test_organizer, idempotency_key=str(uuid.uuid4()))
    assert exc_info.value.status_code == 400
    assert "confirmed" in exc_info.value.detail.lower()

def test_empty_pool_rejected(db_session, test_organizer):
    # Deactivate any previous pools
    db_session.query(StudentPoolSnapshot).update({"is_active": False})
    pool = StudentPoolSnapshot(
        source="test",
        total_fetched=0,
        eligible_count=0,
        invalid_count=0,
        duplicate_count=0,
        pool_hash="emptyhash",
        is_active=True,
        is_confirmed=True,
        students_data="[]",
        validation_summary="{}"
    )
    db_session.add(pool)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        DrawService.execute_draw(db_session, test_organizer, idempotency_key=str(uuid.uuid4()))
    assert exc_info.value.status_code == 400
    assert "empty" in exc_info.value.detail.lower()

def test_winner_selection_distribution(db_session, test_organizer):
    # Test that secrets.choice() draws uniformly across participants
    students = [{"name": f"Student {i}", "reg_no": f"REG{i}"} for i in range(10)]
    pool = StudentPoolSnapshot(
        source="test",
        total_fetched=10,
        eligible_count=10,
        invalid_count=0,
        duplicate_count=0,
        pool_hash="distributionhash",
        is_active=True,
        is_confirmed=True,
        students_data=json.dumps(students),
        validation_summary="{}"
    )
    db_session.add(pool)
    db_session.commit()

    winners = set()
    for _ in range(30):
        draw = DrawService.execute_draw(db_session, test_organizer, idempotency_key=str(uuid.uuid4()))
        winners.add(draw.winner_name)
    
    # Across 30 draws among 10 students, we expect multiple unique winners to be selected
    assert len(winners) > 3
