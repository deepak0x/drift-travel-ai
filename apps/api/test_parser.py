import json
from agents.planner_agent import PlannerAgent
import traceback

dummy_response = "I'm having trouble connecting right now. Try asking: 'What should I eat in Goa?' or 'Give me beach activity ideas' 🏖️"

agent = PlannerAgent()
try:
    print("Testing parser...")
    parsed = agent._parse_json(dummy_response)
    print("Parsed result:", parsed)
except Exception as e:
    print("Parse exception:")
    traceback.print_exc()
