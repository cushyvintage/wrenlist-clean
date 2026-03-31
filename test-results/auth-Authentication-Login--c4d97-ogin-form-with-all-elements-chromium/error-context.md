# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - heading "Wrenlist" [level=1] [ref=e7]
    - paragraph [ref=e8]: The operating system for thrifters
  - generic [ref=e9]:
    - heading "Log in to your account" [level=2] [ref=e10]
    - button "Sign in with Google" [ref=e11] [cursor=pointer]:
      - img [ref=e12]
      - text: Sign in with Google
    - generic [ref=e19]: or sign in with email
    - generic [ref=e21]:
      - generic [ref=e22]:
        - generic [ref=e23]: Email
        - textbox "you@example.com" [ref=e24]
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]: Password
          - link "Forgot?" [ref=e28] [cursor=pointer]:
            - /url: /forgot-password
        - textbox "••••••••" [ref=e29]
      - button "Log in" [ref=e30] [cursor=pointer]
    - generic [ref=e33]: OR
    - paragraph [ref=e35]:
      - text: Don't have an account?
      - link "Sign up" [ref=e36] [cursor=pointer]:
        - /url: /register
  - generic [ref=e37]:
    - paragraph [ref=e38]: Wrenlist is a SaaS for UK resellers
    - paragraph [ref=e39]:
      - link "Terms of Service" [ref=e40] [cursor=pointer]:
        - /url: "#"
      - text: ·
      - link "Privacy Policy" [ref=e41] [cursor=pointer]:
        - /url: "#"
```