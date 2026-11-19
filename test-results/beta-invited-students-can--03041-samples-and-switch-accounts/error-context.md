# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: beta.spec.ts >> invited students can save study data, use AI samples, and switch accounts
- Location: e2e\beta.spec.ts:76:1

# Error details

```
Test timeout of 90000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f1e5]:
  - generic [ref=f1e6]:
    - generic [ref=f1e7]: Studexa
    - button "Switch language" [ref=f1e12] [cursor=pointer]: ខ្មែរ
  - generic [ref=f1e13]:
    - heading "Create your account" [level=1] [ref=f1e14]
    - paragraph [ref=f1e15]: Start with a free account. Your streak begins today.
    - generic [ref=f1e16]:
      - generic [ref=f1e17]:
        - generic [ref=f1e18]: Nickname
        - textbox "Nickname" [ref=f1e19]:
          - /placeholder: e.g. Sokha
          - text: Dara
      - generic [ref=f1e20]:
        - generic [ref=f1e21]: Email
        - textbox "Email" [ref=f1e22]:
          - /placeholder: you@example.com
          - text: 837c5f0c-1eb8-476f-9294-d06d3e9ca96e@example.test
      - generic [ref=f1e23]:
        - generic [ref=f1e24]: Password
        - generic [ref=f1e25]:
          - textbox "Password" [ref=f1e26]:
            - /placeholder: At least 8 characters
            - text: Local-test-password-729
          - button "Show password" [ref=f1e27] [cursor=pointer]
      - generic [ref=f1e28]:
        - text: Invite code
        - textbox "Invite code" [ref=f1e29]: zxvXni4mvFO2i15Gio_NW8yZg8T6VVsmxB6X-N6Cc4E
      - generic [ref=f1e30]:
        - checkbox "I am at least 18 years old." [checked] [ref=f1e31]
        - text: I am at least 18 years old.
      - alert [ref=f1e32]: Something went wrong. Please try again.
      - button "Create account" [ref=f1e33] [cursor=pointer]
    - paragraph [ref=f1e36]:
      - text: Already have an account?
      - link "Sign in" [ref=f1e37] [cursor=pointer]:
        - /url: /login
```