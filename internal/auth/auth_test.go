package auth

import (
	"testing"
	"time"
)

func TestJWTRoundTrip(t *testing.T) {
	secret := "test-secret-key-for-unit-tests!!"
	token, err := GenerateToken(42, secret, time.Hour)
	if err != nil {
		t.Fatal(err)
	}

	claims, err := ValidateToken(token, secret)
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != 42 {
		t.Fatalf("expected user_id 42, got %d", claims.UserID)
	}
}

func TestJWTInvalidSecret(t *testing.T) {
	token, _ := GenerateToken(1, "secret-a-32-chars-long-string!!", time.Hour)
	_, err := ValidateToken(token, "secret-b-32-chars-long-string!!")
	if err == nil {
		t.Fatal("expected error for wrong secret")
	}
}

func TestPasswordHashAndVerify(t *testing.T) {
	hash, err := Hash("MyPassword1")
	if err != nil {
		t.Fatal(err)
	}
	if !Verify("MyPassword1", hash) {
		t.Fatal("expected password to verify")
	}
	if Verify("wrong", hash) {
		t.Fatal("expected wrong password to fail")
	}
}

func TestValidateStrength(t *testing.T) {
	tests := []struct {
		pass string
		ok   bool
	}{
		{"short", false},
		{"alllowercase1", false},
		{"ALLUPPERCASE1", false},
		{"NoDigitsHere", false},
		{"Valid1Pass", true},
		{"Str0ngP@ss", true},
	}

	for _, tt := range tests {
		err := ValidateStrength(tt.pass)
		if tt.ok && err != nil {
			t.Errorf("expected %q to pass, got: %v", tt.pass, err)
		}
		if !tt.ok && err == nil {
			t.Errorf("expected %q to fail", tt.pass)
		}
	}
}
