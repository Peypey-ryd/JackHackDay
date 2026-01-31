from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
client = genai.Client()

# Use California_Data.csv in the same folder as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(script_dir, "California_Data.csv")
print("Uploading file...")
file_upload = client.files.upload(
    file=file_path,
    config={'mime_type': 'text/csv'}
)

# Fix 3: Use a valid model like gemini-2.0-flash
print("Generating policy...")
response = client.models.generate_content(
    model="gemini-2.5-flash", 
    contents=[
        file_upload,
        "Generate a policy based on the given data to help "
        "California make the airports more efficient."
    ]
)

print("-" * 30)
print(response.text)

# Write policy to file for the website to display
output_path = os.path.join(script_dir, "policy_output.txt")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(response.text)
print(f"\nPolicy saved to: {output_path}")