from pymongo import MongoClient
from dotenv import load_dotenv
import os
load_dotenv()
client = MongoClient(os.getenv('MONGO_URI'))
db = client['mediscan_db']
print('Total:', db['results'].count_documents({}))
print('Avec modalite:', db['results'].count_documents({'modalite': {'$exists': True, '$ne': None}}))
print('Avec organe:', db['results'].count_documents({'organe': {'$exists': True, '$ne': None}}))
print('Avec mo:', db['results'].count_documents({'mo': {'$exists': True, '$ne': None}}))