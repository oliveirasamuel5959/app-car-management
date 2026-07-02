<<<<<<< HEAD
import logging
import sys
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path


def get_logger(name: str, log_file: bool = True) -> logging.Logger:
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(logging.INFO)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    if log_file:
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        log_path = log_dir / f"{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.FileHandler(log_path, encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    logger.propagate = False
    return logger


@contextmanager
def log_task(description: str, success_msg: str):
    task_logger = get_logger(__name__)
    task_logger.info("%s...", description)
    try:
        yield task_logger
        task_logger.info("%s", success_msg)
    except Exception:
        task_logger.exception("Failed: %s", description)
        raise
=======
import logging
import sys
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager

def get_logger(name: str, log_file: bool = True) -> logging.Logger:
  logger = logging.getLogger(name)

  if logger.handlers:
    return logger

  logger.setLevel(logging.DEBUG)

  formatter = logging.Formatter(
    fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
  )

  stream_handler = logging.StreamHandler(sys.stdout)
  stream_handler.setLevel(logging.INFO)
  stream_handler.setFormatter(formatter)
  logger.addHandler(stream_handler)

  if log_file:
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    log_path = log_dir / f"{datetime.now().strftime('%Y%m%d')}.log"
    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

  logger.propagate = False
  return logger

@contextmanager
def log_task(description: str, success_msg: str):
  task_logger = get_logger(__name__)
  task_logger.info("%s...", description)
  try:
    yield task_logger
    task_logger.info("%s", success_msg)
  except Exception:
    task_logger.exception("Failed: %s", description)
    raise
>>>>>>> c5ef6a45 (WIP: salva alterações locais)
