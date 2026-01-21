import tempfile
from pathlib import Path

from textual_webterm.config import load_compose_manifest, load_landing_yaml


def test_load_landing_yaml_simple():
    data = """
    - name: One
      slug: one
      command: echo one
    - name: Two
      command: echo two
    """
    with tempfile.NamedTemporaryFile("w+", delete=False) as f:
        f.write(data)
        f.flush()
        apps = load_landing_yaml(Path(f.name))
    assert len(apps) == 2
    assert apps[0].slug == "one"
    assert apps[1].command == "echo two"


def test_load_compose_manifest_reads_label():
    data = """
    services:
      svc1:
        labels:
          webterm-command: echo svc1
      svc2:
        labels:
          - webterm-command=echo svc2
      svc3:
        labels:
          other: value
    """
    with tempfile.NamedTemporaryFile("w+", delete=False) as f:
        f.write(data)
        f.flush()
        apps = load_compose_manifest(Path(f.name))
    slugs = {a.slug for a in apps}
    commands = {a.command for a in apps}
    assert slugs == {"svc1", "svc2"}
    assert "echo svc1" in commands and "echo svc2" in commands
