export default class StringUtil {
  public static listOfObjWithIdToCsv(array: Array<WithId>): string {
    return array.map((b) => b.id).join(",");
  }
}

type WithId = { id: string | number };
