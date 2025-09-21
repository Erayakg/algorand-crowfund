import algosdk
from algosdk.v2client import algod
from algosdk import transaction
from algosdk import mnemonic
import base64

ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""
CREATOR_MNEMONIC = "put your 25 word mnemonic phrase here separated by spaces"

from pyteal import *
from crowdfunding_v2 import program

def compile_program(client, source_code):
    compile_response = client.compile(source_code)
    return base64.b64decode(compile_response['result'])

def main():
    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
    creator_sk = mnemonic.to_private_key(CREATOR_MNEMONIC)
    creator_addr = mnemonic.to_public_key(CREATOR_MNEMONIC)

    approval_teal = compileTeal(program, mode=Mode.Application, version=6)
    clear_teal = compileTeal(Approve(), mode=Mode.Application, version=6)

    approval_program = compile_program(client, approval_teal)
    clear_program = compile_program(client, clear_teal)

    global_schema = transaction.StateSchema(num_uints=0, num_byte_slices=2)
    local_schema = transaction.StateSchema(num_uints=0, num_byte_slices=0)

    txn = transaction.ApplicationCreateTxn(
        sender=creator_addr,
        sp=client.suggested_params(),
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
    )

    signed_txn = txn.sign(creator_sk)
    txid = client.send_transaction(signed_txn)
    print("Sent deploy txid:", txid)
    result = transaction.wait_for_confirmation(client, txid, 4)
    print("App ID:", result['application-index'])

if __name__ == "__main__":
    main()
