package com.guardian.exception;

public class InvalidClientException extends RuntimeException {
    public InvalidClientException(String message) {
        super(message);
    }
}
