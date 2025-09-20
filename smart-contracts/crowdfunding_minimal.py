from pyteal import *

def approval_program():
    handle_creation = Seq([
        App.globalPut(Bytes("count"), Int(0)),
        Return(Int(1))
    ])

    handle_optin = Return(Int(1))
    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    # Simple create project
    create_project = Seq([
        App.globalPut(Bytes("count"), App.globalGet(Bytes("count")) + Int(1)),
        Return(Int(1))
    ])

    handle_noop = Cond(
        [Txn.application_args[0] == Bytes("create"), create_project]
    )

    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion() == OnComplete.NoOp, handle_noop]
    )

    return program

def clear_state_program():
    return Return(Int(1))

# Compile the programs
if __name__ == "__main__":
    approval_compiled = compileTeal(approval_program(), Mode.Application, version=4)
    clear_compiled = compileTeal(clear_state_program(), Mode.Application, version=4)

    with open("approval_minimal.teal", "w") as f:
        f.write(approval_compiled)

    with open("clear_minimal.teal", "w") as f:
        f.write(clear_compiled)

    print("Minimal smart contract compiled successfully!")
    print("Files created: approval_minimal.teal, clear_minimal.teal")
