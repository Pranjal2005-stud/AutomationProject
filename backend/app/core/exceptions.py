class AppException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, resource: str, id: int):
        super().__init__(f"{resource} with id {id} not found", status_code=404)


class ExternalServiceException(AppException):
    def __init__(self, service: str, detail: str):
        super().__init__(f"{service} error: {detail}", status_code=502)


class LLMParsingException(AppException):
    def __init__(self, detail: str):
        super().__init__(f"LLM response parsing failed: {detail}", status_code=422)


class DuplicateException(AppException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} already exists", status_code=409)
