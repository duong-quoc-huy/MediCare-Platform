class GHTKError(Exception):
    """Base exception for GHTK integration errors."""


class GHTKConfigurationError(GHTKError):
    """Raised when required GHTK settings are missing."""


class GHTKRequestError(GHTKError):
    """Raised when the GHTK HTTP request fails."""


class GHTKResponseError(GHTKError):
    """Raised when GHTK returns an unsuccessful response."""


class GHTKUnsupportedAddressError(GHTKError):
    """Raised when GHTK does not support the destination."""