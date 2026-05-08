"""
Transaction categorization via keyword matching.
"""

CATEGORY_RULES: dict[str, list[str]] = {
    "Loans": ["emi", "loan", "repayment", "principal", "loan a/c", "loan acct", "loan account", "home loan", "personal loan", "auto loan", "car loan", "bike loan", "education loan", "gold loan", "mortgage", "finance", "nbfc", "bajaj finance", "hdb financial", "muthoot", "manappuram"],
    "Food": ["zomato", "swiggy", "restaurant", "cafe", "dhaba", "food", "eatery", "dineout", "eazydiner", "dominos", "pizza hut", "kfc", "burger king", "mcdonald", "subway", "starbucks", "barbeque nation", "haldiram", "bikanervala", "wow momo", "biryani", "pizza", "burger", "coffee", "bakery", "juice", "tea", "chai"],
    "Grocery": ["bigbasket", "bbnow", "blinkit", "zepto", "dmart", "reliance smart", "spencer", "more store", "nature basket", "grocery", "supermart", "kirana", "daily needs", "vegetables", "fruits", "mart"],
    "OTT Subscriptions": ["netflix", "hotstar", "disney+ hotstar", "prime video", "amazon prime", "spotify", "youtube premium", "zee5", "sonyliv", "apple tv", "jio cinema", "jiocinema", "wynk", "gaana", "audible", "subscription", "ott", "streaming"],
    "Entertainment": ["bookmyshow", "inox", "pvr", "movie", "cinema", "event", "gaming", "playzone", "sports", "concert", "arcade", "bowling", "amusement", "theme park"],
    "Travel": ["irctc", "makemytrip", "goibibo", "ola", "uber", "rapido", "redbus", "flight", "hotel", "airbnb", "booking.com", "oyo", "trip", "travel", "tour", "yatra", "cleartrip", "ixigo", "indigo", "air india", "vistara", "spicejet", "akasa air", "emirates", "etihad", "qatar airways", "singapore airlines", "lufthansa", "cathay pacific", "turkish airlines", "british airways", "airasia"],
    "Credit Card Bills": ["credit card", "cc bill", "card payment", "card settle", "visa payment", "mastercard payment", "amex", "american express", "rupay credit", "credit due"],
    "Health": ["pharmacy", "hospital", "clinic", "lab", "diagnostic", "medicine", "medical", "chemist", "apollo", "medplus", "1mg", "pharmeasy", "netmeds", "wellness forever", "gym", "cult.fit", "health checkup", "doctor", "dentist", "therapy", "physio", "scan", "blood test"],
    "Saving Plans": ["fd", "fixed deposit", "rd", "recurring deposit", "nps", "ppf", "ssy", "investment", "sip", "mutual fund", "elss", "zerodha", "groww", "upstox", "angel one", "kuvera"],
    "Insurance": ["insurance", "premium", "policy", "hdfc life", "icici pru", "bajaj allianz", "sbi life", "policybazaar", "niva bupa", "star health", "tata aig", "acko", "lic", "max life", "aditya birla health", "care health", "new india assurance"],
    "Fashion": ["myntra", "ajio", "nykaa", "zara", "h&m", "pantaloons", "lifestyle", "westside", "clothing", "fashion", "watch", "footwear", "shoes", "apparel", "trends", "max fashion", "uniqlo", "levis"],
    "Fuel / Transport": ["petrol", "diesel", "fuel", "hp petrol", "hindustan petroleum", "indian oil", "iocl", "bpcl", "bharat petroleum", "shell", "nayara", "jio-bp", "metro", "auto", "toll", "fastag", "cng", "ev charging"],
    "Utilities": ["electricity", "water bill", "internet", "broadband", "airtel", "jio", "bsnl", "vodafone", "vi", "mobile recharge", "recharge", "dth", "gas bill", "cylinder", "mngl", "igl", "adani gas", "tataplay", "dish tv", "act fibernet", "hathway"],
    "Education": ["udemy", "coursera", "unacademy", "byju", "physicswallah", "pw", "fee", "tuition", "books", "college", "school", "upgrad", "simplilearn", "coding ninjas", "scaler", "iit", "exam fee"],
    "Transfers": ["upi", "imps", "neft", "rtgs", "transfer", "fund transfer", "bank transfer", "sent to", "received from"],
    "Cash / ATM": ["atm", "cash withdrawal", "cash wdl", "atm wdl", "cash dep", "cash deposit"],
    "Fees & Charges": ["charge", "fee", "penalty", "late fee", "interest charge", "processing fee", "gst", "annual fee", "convenience fee", "service charge"],
    "Miscellaneous": [],
}


def categorize(description: str) -> str:
    desc = str(description).lower()
    for category, keywords in CATEGORY_RULES.items():
        if category == "Miscellaneous":
            continue
        if any(kw in desc for kw in keywords):
            return category
    return "Miscellaneous"
