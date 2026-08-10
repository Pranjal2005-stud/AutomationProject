import logging
import logging.handlers
import os
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
LOG_DIR.mkdir(exist_ok=True)


def _file_handler(filename: str, level: int) -> logging.Handler:
    handler = logging.handlers.RotatingFileHandler(
        LOG_DIR / filename, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    handler.setLevel(level)
    handler.setFormatter(_formatter())
    return handler


def _formatter() -> logging.Formatter:
    return logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(_formatter())
    logger.addHandler(console)

    logger.addHandler(_file_handler("app.log", logging.INFO))
    logger.addHandler(_file_handler("error.log", logging.ERROR))

    logger.propagate = False
    return logger
