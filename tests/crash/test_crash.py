import pytest

from crash_harness import SCENARIOS, Harness, SetupError, run_scenario


@pytest.fixture(scope="module")
def harness():
    try:
        h = Harness()
        h.prepare()
    except SetupError as exc:
        pytest.skip(str(exc))
    yield h
    h.close()


@pytest.mark.parametrize("name,fn", SCENARIOS, ids=[f"{i:02d}" for i in range(1, len(SCENARIOS) + 1)])
def test_crash(harness, name, fn):
    ok, detail = run_scenario(harness, fn)
    print(f"\n{name}\n  {detail}")
    assert ok, f"{name}: {detail}"
