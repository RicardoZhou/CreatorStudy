import GTAutoFitSpriteAssembler2D from "../../../libs/shader/GTAutoFitSpriteAssembler2D";

//@ts-ignore
let gfx = cc.gfx;
let vfmtCustom = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_p", type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_q", type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },
]);

export default class DualBlurAssembler extends GTAutoFitSpriteAssembler2D {
    floatsPerVert = 9;

    colorOffset = 8;

    // todo: mixin this part
    initData() {
        let data = this._renderData;
        // createFlexData支持创建指定格式的renderData
        data.createFlexData(0, this.verticesCount, this.indicesCount, this.getVfmt());

        // createFlexData不会填充顶点索引信息，手动补充一下
        let indices = data.iDatas[0];
        let count = indices.length / 6;
        for (let i = 0, idx = 0; i < count; i++) {
            let vertextID = i * 4;
            indices[idx++] = vertextID;
            indices[idx++] = vertextID+1;
            indices[idx++] = vertextID+2;
            indices[idx++] = vertextID+1;
            indices[idx++] = vertextID+3;
            indices[idx++] = vertextID+2;
        }
    }

    getVfmt() {
        return vfmtCustom;
    }

    getBuffer() {
        //@ts-ignore
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
    }

    updateUVs(sprite) {
        super.updateUVs(sprite);

        // this._uv可以用sprite._spriteFrame.uv代替
        // this._uv是spriteFrame对node大小自适应缩放后的uv
        let uv = this._uv;
        let isRotated = sprite._spriteFrame.isRotated();
        let l = uv[0],
            r = uv[2],
            b = uv[1],
            t = uv[5];
        
        if (isRotated) {
            // cc图集里的旋转总是顺时针旋转90度，以原左下角为中心。（旋转后左下角变为左上角）
            l = uv[1];  r = uv[3];
            b = uv[0];  t = uv[4];
        }

        let px = 1.0 / (r-l),
        qx = -l * px;   // l / (l-r);

        let py = 1.0 / (b-t),
        qy = -t * py;   // t / (t-b);

        // ATTR_UV0 偏移量
        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];
        for (let i = 0; i < 4; i++) {
            let dstOffset = floatsPerVert * i + uvOffset + 2;
            if (isRotated) {
                verts[dstOffset + 0] = py;
                verts[dstOffset + 1] = px;
                verts[dstOffset + 2] = qy;
                verts[dstOffset + 3] = qx;
            } else {
                verts[dstOffset + 0] = px;
                verts[dstOffset + 1] = py;
                verts[dstOffset + 2] = qx;
                verts[dstOffset + 3] = qy;
            }
        }
    }

}
