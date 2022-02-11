import DualBlurAssembler from "./DualBlurAssembler";

const {ccclass, property} = cc._decorator;

@ccclass
export default class DualBlurSprite extends cc.Sprite {

    _resetAssembler() {
        this.setVertsDirty();
        let assembler = this._assembler = new DualBlurAssembler();
        this.flushProperties();
        assembler.init(this);
    }

    flushProperties() {
        //@ts-ignore
        let assembler: AvatarAssembler = this._assembler;
        if (!assembler)
            return;

        this.setVertsDirty();
    }

}
