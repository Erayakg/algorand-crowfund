import algosdk
from algosdk.v2client import algod
from algosdk import transaction
from algosdk import mnemonic
import base64

# Network configuration
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""

# Your wallet mnemonic - REPLACE THIS!
CREATOR_MNEMONIC = "put your 25 word mnemonic phrase here separated by spaces"

def compile_program(client, source_code):
    """Compile TEAL source code"""
    compile_response = client.compile(source_code)
    return base64.b64decode(compile_response['result'])

def deploy_contract():
    """Deploy the crowdfunding v2 contract"""
    try:
        # Initialize client
        client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
        
        # Get account from mnemonic
        creator_sk = mnemonic.to_private_key(CREATOR_MNEMONIC)
        creator_addr = mnemonic.to_public_key(CREATOR_MNEMONIC)
        
        print(f"Deploying from account: {creator_addr}")
        
        # Get account balance
        account_info = client.account_info(creator_addr)
        balance = account_info['amount'] / 1000000  # Convert microAlgos to Algos
        print(f"Account balance: {balance} ALGO")
        
        if balance < 0.1:
            print("❌ Insufficient balance! You need at least 0.1 ALGO to deploy.")
            return None
        
        # Read and compile TEAL programs
        # Approval program (from crowdfunding_v2.py)
        approval_teal = """
#pragma version 6
txn ApplicationArgs 0
byte "create_project"
==
bnz main_l2
int 1
!
assert
b main_l3
main_l2:
txn NumAppArgs
int 8
==
assert
txna ApplicationArgs 3
btoi
int 0
>
assert
txna ApplicationArgs 4
btoi
global LatestTimestamp
>
assert
txna ApplicationArgs 6
btoi
int 0
>
assert
txna ApplicationArgs 7
len
int 10
>
assert
byte "last_project_name"
txna ApplicationArgs 1
app_global_put
byte "last_project_image"
txna ApplicationArgs 7
app_global_put
int 1
return
main_l3:
int 0
return
"""
        
        # Clear program (simple approve)
        clear_teal = """
#pragma version 6
int 1
"""
        
        # Compile programs
        approval_program = compile_program(client, approval_teal)
        clear_program = compile_program(client, clear_teal)
        
        # Define state schemas
        global_schema = transaction.StateSchema(num_uints=0, num_byte_slices=3)
        local_schema = transaction.StateSchema(num_uints=0, num_byte_slices=0)
        
        # Create application create transaction
        params = client.suggested_params()
        
        txn = transaction.ApplicationCreateTxn(
            sender=creator_addr,
            sp=params,
            on_complete=transaction.OnComplete.NoOpOC,
            approval_program=approval_program,
            clear_program=clear_program,
            global_schema=global_schema,
            local_schema=local_schema,
        )
        
        # Sign transaction
        signed_txn = txn.sign(creator_sk)
        
        # Submit transaction
        txid = client.send_transaction(signed_txn)
        print(f"🚀 Deploy transaction sent: {txid}")
        
        # Wait for confirmation
        print("⏳ Waiting for confirmation...")
        result = transaction.wait_for_confirmation(client, txid, 4)
        
        # Get app ID
        app_id = result['application-index']
        print(f"✅ SUCCESS! New App ID: {app_id}")
        print(f"🌐 AlgoExplorer: https://testnet.algoexplorer.io/application/{app_id}")
        
        return app_id
        
    except Exception as e:
        print(f"❌ Deploy failed: {str(e)}")
        return None

if __name__ == "__main__":
    print("🔨 Deploying Crowdfunding V2 Contract...")
    print("=" * 50)
    
    # Check if mnemonic is set
    if "put your" in CREATOR_MNEMONIC:
        print("❌ Please update CREATOR_MNEMONIC with your actual mnemonic!")
        exit(1)
    
    app_id = deploy_contract()
    
    if app_id:
        print("\n" + "=" * 50)
        print("🎉 DEPLOYMENT SUCCESSFUL!")
        print(f"📱 App ID: {app_id}")
        print("\n💡 Next steps:")
        print(f"1. Update frontend APP_ID to: {app_id}")
        print("2. Test create_project functionality")
        print("3. Add image upload feature")
    else:
        print("\n💥 Deployment failed!")