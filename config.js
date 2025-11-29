const CONFIG = {
    // Service Account Details
    SERVICE_ACCOUNT_EMAIL: 'expense-tracker@expenses-tracker-479710.iam.gserviceaccount.com',
    PRIVATE_KEY_ID: '7843ed4fa86c93ab7e7e294ff279f004b89f77b9',
    // Note: In a real production app, the private key should NEVER be exposed on the client side.
    // Since this is a personal tool for local/controlled usage, we are embedding it here.
    PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCg+GQHUDjwgU0y
O4YMC+LE2y5PlGs8TG0e/U10nT5RpLIPMfuc/I2zd1NUA6Krd+UytvCuOZawnSMA
uH0RKAKcefVT0ce+EykMDsTATNAFnIyAHqL7FwHlvr53Po+ZFgXLtWH3h70de0IJ
ejB8yQWZHXq/XWL6pwlyuPyOCw3WHFsowV3TwRJSmdPmJFVqaIsBt4hfuazq+/Ri
Qxb2qvfwgJGRRPuQxb9GXVsVC0dOyWWhzs0PpwqYC5H4rALZ2awAu2YH7ySDJNuM
DcYmu/9P/ArO7GjX1iONUL4SZ793Pbu3f5lyPvbAIjT9cFRyIXKimHQjk7iJehsk
CItTWrunAgMBAAECggEAOk+QiLeuUK0+Riaa2e1KUe5mGczVhcvXsaSntMkrZI7p
M6jzETzJpgvhQytn935gqBzuFeblqAfcQKwUHi1kuMNTM/Bnz3qIYYZODq0kpAvA
N78hYhzFArE0tOSURyvboJ4NpYnl33KhiuZY/zMg1IUBzKWrL8pnmUfasSfe9MLQ
HbZIIR+wZCyn9tu+zmpLyqLstPNi/s265XS7NglsGezSmRDdYK+kyPfSa4ayDm+I
nAJ3Sp1e5UkmMLFvXXbV2v/NgY2yc+D65d4KZW1/ZUyvCmjs0r5j/CBG5cvZwVhH
SGP1Nq+ARLSNOW0DTupVMuj2CwYzfXB4sSp8juojKQKBgQDfojNoyqs6Cau8hOVM
whq//WXnT5iEuAJR6pdfZV6TKBf9bnBonuI/Oo+oorBk/r8AOgv1P7+c57TlzKgU
kyZrA+0w59qiEbDTJ7z1ZfZj4FhG1cSlq++rIxHE9HEPvtTVgd0t9YL+H8QGP+Sq
+1uPW5SZYVspwBAfJaJFdh9AmQKBgQC4RHcLYSHy68dBAMsH9zAOU6Ng9TanbySv
RUS4DMgPXWmUzOjlSmtEYvKAZHcFpeKa+0JV7UgA1IKyCiu1p4P7Y4UNx1vQVHEN
uc+551Qe4t/JcHpVK2xq5eUSo+Zax0uyYiJmXnlf0ItHaEj/UM8bM8EiNA1B5o5h
v54QJgBGPwKBgQCNBI0CcXpTmLGQqQSmyGdx1Woi2FBGsHnWCeX2I8flZ4zpJHEB
p97nHBhmsGAm73SlwfS0a8R6PqoVll4Oy1OYe9tf0XROanVkUVSYMfmStW81C6t7
BNaWxgB4f+OjmCRBlihQyNYXRRSpFDUvlF0CIy+rIHcJ9rCz01lmD7xZUQKBgF1ek9O4TDODNVvCwx4uKrOXvdmLZz5AGx6UwtVf5J+kfbNggUJuCxyD5s0YGxdJjyFo
35wat7lz9SWx8aQCVeYz71+j/On7X63M0W0pwn5EB5FS5Sny7uTbyM9BLaAiDEE/
aJ7mkCn0yh5MwXBdyhPGjb5/EZiq8sqlBbq5BrqRAoGBAK28r/+53uQ4En63/4dn
VvbFAzoEKytHG+foEQbT2fqoeLAjR+kyW8EhfCafENk+bGAZb7tm/NPiIlZzNY0A
/58aT2yAzqPPcvM9lBb1a5iE2Ym5QLcBNkzPqIzvJnw1n7OBcF+DcREKWPQX7VVd
DZzGMOjT1gLATBfDIoi0pdBr
-----END PRIVATE KEY-----`,

    // Sheet Details
    SPREADSHEET_ID: '1WmjWUVIquLrnZT3BA-nvNoISbSHbxaFfAF1hUmddLvQ',
    SHEET_NAMES: {
        BUDGETS: 'Budgets',
        EXPENSES: 'Expenses',
        CATEGORIES: 'Categories'
    },

    // App Constants
    CATEGORIES: [
        "Travel", "Rent", "Groceries", "Zomato", "Cigarettes", "Wifi",
        "Electricity", "Water", "Maid", "Dining", "Rentomojo",
        "Entertainment", "Utilities", "Personal", "Shopping"
    ],
    USERS: ["Abhishek", "Stuti"],
    COLORS: {
        CATEGORIES: {
            "Travel": "#4285F4",
            "Rent": "#A020F0",
            "Groceries": "#34A853",
            "Zomato": "#FF6347",
            "Cigarettes": "#FBBC04",
            "Wifi": "#20B2AA",
            "Electricity": "#FFD700",
            "Water": "#1E90FF",
            "Maid": "#FF8C00",
            "Dining": "#EA4335",
            "Rentomojo": "#FF8C00",
            "Entertainment": "#9C27B0",
            "Utilities": "#FF6D00",
            "Personal": "#00BCD4",
            "Shopping": "#FF1744"
        },
        PEOPLE: {
            "Abhishek": "#4CAF50",
            "Stuti": "#FF1493"
        },
        SPENT_BAR_GRADIENT: {
            "0-60": "#FFEB3B",
            "60-75": "#FDD835",
            "75-90": "#FBC02D",
            "90-100": "#FFA726",
            "100-110": "#FF9800",
            "110+": "#F44336"
        }
    }
};
