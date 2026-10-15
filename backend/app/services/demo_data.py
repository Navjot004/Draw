import random
from typing import List, Tuple

FIRST_NAMES = [
    "Aarav", "Aditi", "Advait", "Akash", "Ananya", "Aniket", "Anushka", "Arjun",
    "Aryan", "Ayush", "Bhavya", "Chetan", "Dev", "Dhruv", "Diya", "Gaurav",
    "Harsh", "Isha", "Ishaan", "Kavya", "Khushi", "Krishna", "Manish", "Meera",
    "Mohit", "Navjot", "Neha", "Nikhil", "Pooja", "Pranav", "Priya", "Rahul",
    "Rhea", "Rishi", "Rohan", "Sakshi", "Samarth", "Sanvi", "Shreya", "Siddharth",
    "Sneha", "Sparsh", "Tanvi", "Utkarsh", "Vaishnavi", "Varun", "Vedant", "Yash",
    "Zara", "Amina", "Marcus", "Elena", "Lucas", "Sofia", "Mateo", "Chloe"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Mehta",
    "Jain", "Bose", "Choudhury", "Nair", "Rao", "Iyer", "Kaur", "Das",
    "Banerjee", "Mukherjee", "Chatterjee", "Mishra", "Pandey", "Trivedi",
    "Kapoor", "Bhatia", "Malhotra", "Saxena", "Soni", "Chauhan", "Yadav",
    "Joshi", "Menon", "Pillai", "Shah", "Deshmukh", "Kulkarni", "Patil"
]

BRANCHES = ["CS", "IT", "EC", "EE", "ME", "CE", "BT", "AI", "DS"]

def generate_demo_students(count: int = 6250) -> List[Tuple[str, str]]:
    """
    Generate 6,000+ realistic student records for demonstration mode.
    Includes realistic names, registration numbers with leading zeros,
    and a tiny handful of invalid/duplicate records to demonstrate validation.
    """
    # Deterministic seed so demo is consistent across server restarts
    rng = random.Random(42)
    students: List[Tuple[str, str]] = []

    # Generate 6,240 valid unique students
    for i in range(1, count - 10):
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        name = f"{first} {last}"
        
        branch = rng.choice(BRANCHES)
        year = rng.choice(["21", "22", "23", "24"])
        # Format with leading zeros e.g. "00412" or "24CS00412"
        roll = f"{i:05d}"
        reg_no = f"REG{year}{branch}{roll}"
        students.append((name, reg_no))

    # Add a few realistic leading-zero numbers like "001293"
    for i in range(1, 15):
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        students.append((f"{first} {last}", f"00{i:04d}"))

    # Add a few intentional duplicate records to test validation
    students.append(("Aarav Sharma", students[0][1]))  # Exact duplicate of reg_no
    students.append(("Arjun Singh (Duplicate)", students[1][1].lower()))  # Case-insensitive duplicate
    students.append(("Rohan Verma", students[5][1]))

    # Add a few intentional invalid records (blank name, blank reg, whitespace only)
    students.append(("", "REG24CS99991"))
    students.append(("   ", "REG24CS99992"))
    students.append(("Invalid Student Without Reg", ""))
    students.append(("Whitespace Student", "   "))

    return students
