from pyteal import *

# Crowdfunding v2: Proper create_project logic

CREATE_PROJECT = Bytes("create_project")

@Subroutine(TealType.none)
def create_project():
    return Seq([
        Assert(Txn.application_args.length() == Int(8)),
        # Args: [action, name, description, targetAmount, deadline, category, threshold, imageHash]
        # Validate targetAmount > 0
        Assert(Btoi(Txn.application_args[3]) > Int(0)),
        # Validate deadline > now
        Assert(Btoi(Txn.application_args[4]) > Global.latest_timestamp()),
        # Validate threshold > 0
        Assert(Btoi(Txn.application_args[6]) > Int(0)),
        # Validate image hash length (IPFS hash is usually 46 chars)
        Assert(Len(Txn.application_args[7]) > Int(10)),
        # Store project info in global state
        App.globalPut(Bytes("last_project_name"), Txn.application_args[1]),
        App.globalPut(Bytes("last_project_image"), Txn.application_args[7]),
        Approve()
    ])

program = Cond(
    [Txn.application_args[0] == CREATE_PROJECT, create_project()],
    [Int(1), Reject()]
)

if __name__ == "__main__":
    print(compileTeal(program, mode=Mode.Application, version=6))
