import asyncio
import os
from agents.planner_agent import PlannerAgent

async def test_chat():
    os.environ["OPENAI_API_KEY"] = "dummy" # We just want the prompt formatting error, if any
    
    agent = PlannerAgent()
    itinerary = {"summary": "A romantic trip to Tokyo and Kyoto."}
    try:
        res = await agent.modify_itinerary("add more hotels", itinerary)
        print(res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chat())
